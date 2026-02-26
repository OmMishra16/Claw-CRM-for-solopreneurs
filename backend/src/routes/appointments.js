const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../db');
const { authenticate } = require('../middleware/auth');
const {
  MAX_SERIES_LENGTH,
  generateRecurringDates,
  overlapFilter,
} = require('../lib/scheduling');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schema
const appointmentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  serviceId: z.string().uuid('Invalid service ID'),
  dateTime: z.string().datetime({ message: 'Invalid date/time format' }),
  notes: z.string().optional(),
  // Recurrence fields
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  recurrenceEndDate: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled'])
});

// Helper: Check for conflicting appointments
const checkConflict = async (userId, dateTime, endTime, excludeId = null) => {
  let query = supabase
    .from('appointments')
    .select('id, date_time, end_time')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .or(overlapFilter(dateTime, endTime));

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: conflicts } = await query;
  return conflicts && conflicts.length > 0 ? conflicts : null;
};

// GET /api/appointments - List appointments with filters
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, clientId } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        clients (id, name, phone),
        services (id, title, duration, price, currency)
      `)
      .eq('user_id', req.userId)
      .order('date_time', { ascending: true });

    if (startDate) {
      query = query.gte('date_time', startDate);
    }
    if (endDate) {
      query = query.lte('date_time', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Get appointments error:', error);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }

    res.json({
      appointments: appointments.map(a => ({
        id: a.id,
        dateTime: a.date_time,
        endTime: a.end_time,
        status: a.status,
        notes: a.notes,
        createdAt: a.created_at,
        client: a.clients ? {
          id: a.clients.id,
          name: a.clients.name,
          phone: a.clients.phone
        } : null,
        service: a.services ? {
          id: a.services.id,
          title: a.services.title,
          duration: a.services.duration,
          price: parseFloat(a.services.price),
          currency: a.services.currency
        } : null
      }))
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/today - Get today's appointments
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (id, name, phone),
        services (id, title, duration, price, currency)
      `)
      .eq('user_id', req.userId)
      .gte('date_time', startOfDay)
      .lte('date_time', endOfDay)
      .neq('status', 'cancelled')
      .order('date_time', { ascending: true });

    if (error) {
      console.error('Get today appointments error:', error);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }

    // Calculate today's revenue
    const todayRevenue = appointments
      .filter(a => a.status === 'completed' && a.services)
      .reduce((sum, a) => sum + parseFloat(a.services.price || 0), 0);

    res.json({
      date: new Date().toISOString().split('T')[0],
      count: appointments.length,
      todayRevenue,
      appointments: appointments.map(a => ({
        id: a.id,
        dateTime: a.date_time,
        endTime: a.end_time,
        status: a.status,
        notes: a.notes,
        client: a.clients ? {
          id: a.clients.id,
          name: a.clients.name,
          phone: a.clients.phone
        } : null,
        service: a.services ? {
          id: a.services.id,
          title: a.services.title,
          duration: a.services.duration,
          price: parseFloat(a.services.price),
          currency: a.services.currency
        } : null
      }))
    });
  } catch (error) {
    console.error('Get today appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/stats - Get revenue stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();

    // This week (Monday to Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    // This month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        date_time,
        status,
        services (price)
      `)
      .eq('user_id', req.userId)
      .eq('status', 'completed')
      .gte('date_time', startOfMonth.toISOString());

    if (error) {
      console.error('Get stats error:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    let weekRevenue = 0;
    let monthRevenue = 0;
    let weekCount = 0;
    let monthCount = 0;

    appointments.forEach(a => {
      const appointmentDate = new Date(a.date_time);
      const revenue = a.services ? parseFloat(a.services.price || 0) : 0;

      monthRevenue += revenue;
      monthCount++;

      if (appointmentDate >= startOfWeek) {
        weekRevenue += revenue;
        weekCount++;
      }
    });

    res.json({
      week: {
        revenue: weekRevenue,
        count: weekCount
      },
      month: {
        revenue: monthRevenue,
        count: monthCount
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/appointments - Create new appointment (supports recurring)
router.post('/', async (req, res) => {
  try {
    const validation = appointmentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { clientId, serviceId, dateTime, notes, isRecurring, recurrencePattern, recurrenceEndDate } = validation.data;

    // Get service to calculate end time
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration')
      .eq('id', serviceId)
      .eq('user_id', req.userId)
      .single();

    if (serviceError || !service) {
      return res.status(400).json({ error: 'Service not found' });
    }

    // Verify client belongs to user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', req.userId)
      .single();

    if (clientError || !client) {
      return res.status(400).json({ error: 'Client not found' });
    }

    // Generate dates for recurring or single appointment
    let appointmentDates = [new Date(dateTime)];
    let seriesId = null;

    if (isRecurring && recurrencePattern && recurrenceEndDate) {
      appointmentDates = generateRecurringDates(dateTime, recurrencePattern, recurrenceEndDate);
      seriesId = uuidv4();

      // Limit to 53 appointments (a full calendar year of weekly, both endpoints included)
      if (appointmentDates.length > MAX_SERIES_LENGTH) {
        return res.status(400).json({ error: `Cannot create more than ${MAX_SERIES_LENGTH} recurring appointments at once` });
      }
    }

    // Check for conflicts on all dates
    const conflictingDates = [];
    for (const date of appointmentDates) {
      const startTime = date;
      const endTime = new Date(startTime.getTime() + service.duration * 60000);
      const conflicts = await checkConflict(req.userId, startTime.toISOString(), endTime.toISOString());
      if (conflicts) {
        conflictingDates.push({
          date: startTime.toISOString(),
          conflicts: conflicts.map(c => ({
            id: c.id,
            dateTime: c.date_time,
            endTime: c.end_time
          }))
        });
      }
    }

    if (conflictingDates.length > 0) {
      return res.status(409).json({
        error: `${conflictingDates.length} time slot(s) conflict with existing appointments`,
        conflictingDates
      });
    }

    // Create all appointments
    const appointmentsToInsert = appointmentDates.map(date => {
      const startTime = date;
      const endTime = new Date(startTime.getTime() + service.duration * 60000);
      return {
        user_id: req.userId,
        client_id: clientId,
        service_id: serviceId,
        date_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending',
        notes: notes || null,
        series_id: seriesId,
        is_recurring: isRecurring || false,
        recurrence_pattern: recurrencePattern || null,
        recurrence_end_date: recurrenceEndDate || null,
      };
    });

    const { data: appointments, error } = await supabase
      .from('appointments')
      .insert(appointmentsToInsert)
      .select(`
        *,
        clients (id, name, phone),
        services (id, title, duration, price, currency)
      `);

    if (error) {
      console.error('Create appointment error:', error);
      return res.status(500).json({ error: 'Failed to create appointment' });
    }

    // Return first appointment for single, or summary for recurring
    const firstAppointment = appointments[0];
    res.status(201).json({
      message: isRecurring
        ? `Created ${appointments.length} recurring appointments`
        : 'Appointment created successfully',
      count: appointments.length,
      seriesId: seriesId,
      appointment: {
        id: firstAppointment.id,
        dateTime: firstAppointment.date_time,
        endTime: firstAppointment.end_time,
        status: firstAppointment.status,
        notes: firstAppointment.notes,
        seriesId: firstAppointment.series_id,
        isRecurring: firstAppointment.is_recurring,
        recurrencePattern: firstAppointment.recurrence_pattern,
        client: firstAppointment.clients ? {
          id: firstAppointment.clients.id,
          name: firstAppointment.clients.name,
          phone: firstAppointment.clients.phone
        } : null,
        service: firstAppointment.services ? {
          id: firstAppointment.services.id,
          title: firstAppointment.services.title,
          duration: firstAppointment.services.duration,
          price: parseFloat(firstAppointment.services.price),
          currency: firstAppointment.services.currency
        } : null
      }
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/appointments/:id/status - Update appointment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = statusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const { status } = validation.data;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select(`
        *,
        clients (id, name, phone),
        services (id, title, duration, price, currency)
      `)
      .single();

    if (error || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Status updated successfully',
      appointment: {
        id: appointment.id,
        dateTime: appointment.date_time,
        endTime: appointment.end_time,
        status: appointment.status,
        notes: appointment.notes,
        client: appointment.clients ? {
          id: appointment.clients.id,
          name: appointment.clients.name,
          phone: appointment.clients.phone
        } : null,
        service: appointment.services ? {
          id: appointment.services.id,
          title: appointment.services.title,
          duration: appointment.services.duration,
          price: parseFloat(appointment.services.price),
          currency: appointment.services.currency
        } : null
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = appointmentSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message
      });
    }

    const updates = {};
    const { clientId, serviceId, dateTime, notes } = validation.data;

    if (clientId) updates.client_id = clientId;
    if (serviceId) updates.service_id = serviceId;
    if (notes !== undefined) updates.notes = notes || null;

    // If date/time or service changed, recalculate end time
    if (dateTime || serviceId) {
      const finalServiceId = serviceId || (await supabase
        .from('appointments')
        .select('service_id')
        .eq('id', id)
        .single()
      ).data?.service_id;

      const { data: service } = await supabase
        .from('services')
        .select('duration')
        .eq('id', finalServiceId)
        .single();

      if (service) {
        const startTime = new Date(dateTime || (await supabase
          .from('appointments')
          .select('date_time')
          .eq('id', id)
          .single()
        ).data?.date_time);

        updates.date_time = startTime.toISOString();
        updates.end_time = new Date(startTime.getTime() + service.duration * 60000).toISOString();

        // Check for conflicts (excluding this appointment)
        const conflicts = await checkConflict(req.userId, updates.date_time, updates.end_time, id);
        if (conflicts) {
          return res.status(409).json({
            error: 'Time slot conflicts with existing appointment',
            conflicts
          });
        }
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select(`
        *,
        clients (id, name, phone),
        services (id, title, duration, price, currency)
      `)
      .single();

    if (error || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment updated successfully',
      appointment: {
        id: appointment.id,
        dateTime: appointment.date_time,
        endTime: appointment.end_time,
        status: appointment.status,
        notes: appointment.notes,
        client: appointment.clients,
        service: appointment.services
      }
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/appointments/:id - Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) {
      console.error('Delete appointment error:', error);
      return res.status(500).json({ error: 'Failed to delete appointment' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/appointments/series/:seriesId - Cancel all future appointments in a series
router.delete('/series/:seriesId', async (req, res) => {
  try {
    const { seriesId } = req.params;
    const now = new Date().toISOString();

    // Only cancel future appointments that are pending or confirmed
    const { data: cancelled, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('series_id', seriesId)
      .eq('user_id', req.userId)
      .gte('date_time', now)
      .in('status', ['pending', 'confirmed'])
      .select('id');

    if (error) {
      console.error('Cancel series error:', error);
      return res.status(500).json({ error: 'Failed to cancel recurring appointments' });
    }

    res.json({
      message: `Cancelled ${cancelled?.length || 0} upcoming appointments in this series`,
      cancelledCount: cancelled?.length || 0
    });
  } catch (error) {
    console.error('Cancel series error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
