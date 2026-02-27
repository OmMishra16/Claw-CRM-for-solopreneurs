const express = require('express');
const { z } = require('zod');
const { supabase } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation schema
const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
});

// POST /api/ratings - Submit a rating
router.post('/', authenticate, async (req, res) => {
  try {
    const validation = ratingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { rating } = validation.data;

    // Check if user has already rated
    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', req.userId)
      .single();

    if (existingRating) {
      // Update existing rating
      const { data: updatedRating, error } = await supabase
        .from('ratings')
        .update({
          rating,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) {
        console.error('Update rating error:', error);
        return res.status(500).json({ error: 'Failed to update rating' });
      }

      return res.json({
        message: 'Rating updated successfully',
        rating: updatedRating
      });
    }

    // Create new rating
    const { data: newRating, error } = await supabase
      .from('ratings')
      .insert({
        user_id: req.userId,
        rating
      })
      .select()
      .single();

    if (error) {
      console.error('Create rating error:', error);
      return res.status(500).json({ error: 'Failed to submit rating' });
    }

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating: newRating
    });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ratings/me - Get user's rating
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: rating, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', req.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get rating error:', error);
      return res.status(500).json({ error: 'Failed to get rating' });
    }

    res.json({ rating: rating || null });
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
