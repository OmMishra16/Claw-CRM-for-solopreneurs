const express = require('express');
const { z } = require('zod');
const { supabase } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schema
const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional()
});

// GET /api/clients - List all clients for user
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', req.userId)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: clients, error } = await query;

    if (error) {
      console.error('Get clients error:', error);
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    // Get appointment counts for each client
    const clientIds = clients.map(c => c.id);

    const { data: appointmentStats } = await supabase
      .from('appointments')
      .select('client_id, service_id')
      .in('client_id', clientIds)
      .eq('status', 'completed');

    const statsMap = {};
    if (appointmentStats) {
      appointmentStats.forEach(apt => {
        if (!statsMap[apt.client_id]) {
          statsMap[apt.client_id] = { count: 0 };
        }
        statsMap[apt.client_id].count++;
      });
    }

    res.json({
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        appointmentCount: statsMap[c.id]?.count || 0,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/clients/:id - Get single client with appointment history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (error || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get appointment history
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        id,
        date_time,
        end_time,
        status,
        notes,
        services (
          id,
          title,
          price,
          currency
        )
      `)
      .eq('client_id', id)
      .eq('user_id', req.userId)
      .order('date_time', { ascending: false })
      .limit(20);

    // Calculate total revenue from this client
    const totalRevenue = appointments
      ?.filter(a => a.status === 'completed' && a.services)
      .reduce((sum, a) => sum + parseFloat(a.services.price || 0), 0) || 0;

    res.json({
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
        createdAt: client.created_at,
        totalRevenue,
        appointments: appointments?.map(a => ({
          id: a.id,
          dateTime: a.date_time,
          endTime: a.end_time,
          status: a.status,
          notes: a.notes,
          service: a.services ? {
            id: a.services.id,
            title: a.services.title,
            price: parseFloat(a.services.price),
            currency: a.services.currency
          } : null
        })) || []
      }
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/clients - Create new client
router.post('/', async (req, res) => {
  try {
    const validation = clientSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { name, phone, email, notes } = validation.data;

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: req.userId,
        name,
        phone,
        email: email || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Create client error:', error);
      return res.status(500).json({ error: 'Failed to create client' });
    }

    res.status(201).json({
      message: 'Client created successfully',
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
        createdAt: client.created_at
      }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = clientSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const updates = { ...validation.data };
    if (updates.email === '') updates.email = null;
    updates.updated_at = new Date().toISOString();

    const { data: client, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      message: 'Client updated successfully',
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
        createdAt: client.created_at
      }
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/clients/:id - Delete client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) {
      console.error('Delete client error:', error);
      return res.status(500).json({ error: 'Failed to delete client' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
