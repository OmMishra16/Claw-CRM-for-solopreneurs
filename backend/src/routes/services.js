const express = require('express');
const { z } = require('zod');
const { supabase } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schema
const serviceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  duration: z.number().min(5, 'Duration must be at least 5 minutes'),
  price: z.number().min(0, 'Price cannot be negative'),
  currency: z.string().default('INR'),
  isActive: z.boolean().default(true)
});

// GET /api/services - List all services for user
router.get('/', async (req, res) => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get services error:', error);
      return res.status(500).json({ error: 'Failed to fetch services' });
    }

    res.json({
      services: services.map(s => ({
        id: s.id,
        title: s.title,
        duration: s.duration,
        price: parseFloat(s.price),
        currency: s.currency,
        isActive: s.is_active,
        createdAt: s.created_at
      }))
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/services - Create new service
router.post('/', async (req, res) => {
  try {
    const validation = serviceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { title, duration, price, currency, isActive } = validation.data;

    const { data: service, error } = await supabase
      .from('services')
      .insert({
        user_id: req.userId,
        title,
        duration,
        price,
        currency,
        is_active: isActive
      })
      .select()
      .single();

    if (error) {
      console.error('Create service error:', error);
      return res.status(500).json({ error: 'Failed to create service' });
    }

    res.status(201).json({
      message: 'Service created successfully',
      service: {
        id: service.id,
        title: service.title,
        duration: service.duration,
        price: parseFloat(service.price),
        currency: service.currency,
        isActive: service.is_active,
        createdAt: service.created_at
      }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/services/:id - Update service
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = serviceSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const updates = {};
    if (validation.data.title !== undefined) updates.title = validation.data.title;
    if (validation.data.duration !== undefined) updates.duration = validation.data.duration;
    if (validation.data.price !== undefined) updates.price = validation.data.price;
    if (validation.data.currency !== undefined) updates.currency = validation.data.currency;
    if (validation.data.isActive !== undefined) updates.is_active = validation.data.isActive;
    updates.updated_at = new Date().toISOString();

    const { data: service, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      message: 'Service updated successfully',
      service: {
        id: service.id,
        title: service.title,
        duration: service.duration,
        price: parseFloat(service.price),
        currency: service.currency,
        isActive: service.is_active,
        createdAt: service.created_at
      }
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/services/:id - Delete service
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) {
      console.error('Delete service error:', error);
      return res.status(500).json({ error: 'Failed to delete service' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
