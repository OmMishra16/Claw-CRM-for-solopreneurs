const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { supabase } = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendPasswordResetEmail, generateResetCode } = require('../services/email');

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  businessName: z.string().min(2, 'Business name is required'),
  phone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required')
});

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { email, password, businessName, phone } = validation.data;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        business_name: businessName,
        phone: phone || null
      })
      .select('id, email, business_name, phone, created_at')
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.business_name,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { email, password } = validation.data;

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.business_name,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, business_name, phone, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        businessName: user.business_name,
        phone: user.phone,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile - Update user profile
const updateProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').optional(),
  phone: z.string().optional(),
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const updates = {};
    if (validation.data.businessName) {
      updates.business_name = validation.data.businessName;
    }
    if (validation.data.phone !== undefined) {
      updates.phone = validation.data.phone || null;
    }
    updates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.userId)
      .select('id, email, business_name, phone, created_at')
      .single();

    if (error || !user) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        businessName: user.business_name,
        phone: user.phone,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password - Request password reset
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

router.post('/forgot-password', async (req, res) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { email } = validation.data;

    // Find user (don't reveal if email exists or not for security)
    const { data: user } = await supabase
      .from('users')
      .select('id, business_name')
      .eq('email', email.toLowerCase())
      .single();

    if (user) {
      // Generate 6-digit code
      const code = generateResetCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Delete any existing reset codes for this user
      await supabase
        .from('password_resets')
        .delete()
        .eq('user_id', user.id);

      // Store new reset code
      const { error: insertError } = await supabase
        .from('password_resets')
        .insert({
          user_id: user.id,
          code,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error('Insert reset code error:', insertError);
        return res.status(500).json({ error: 'Failed to process request' });
      }

      // Send email
      try {
        await sendPasswordResetEmail(email.toLowerCase(), code, user.business_name);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Don't fail the request if email fails, but log it
      }
    }

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account exists with this email, you will receive a reset code shortly.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password - Reset password with code
const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
  code: z.string().length(6, 'Code must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

router.post('/reset-password', async (req, res) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { email, code, newPassword } = validation.data;

    // Find user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Find valid reset code
    const { data: resetRecord } = await supabase
      .from('password_resets')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .single();

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Check if code is expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      // Delete expired code
      await supabase
        .from('password_resets')
        .delete()
        .eq('id', resetRecord.id);

      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update password error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Delete used reset code
    await supabase
      .from('password_resets')
      .delete()
      .eq('id', resetRecord.id);

    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
