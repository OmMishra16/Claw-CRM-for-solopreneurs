const express = require('express');
const { supabase } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/analytics/overview - Get comprehensive analytics
router.get('/overview', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days) || 30;

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - daysInt);

    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysInt);

    // Fetch all completed appointments in current period
    const { data: currentAppointments, error: currentError } = await supabase
      .from('appointments')
      .select(`
        id,
        date_time,
        status,
        client_id,
        service_id,
        clients (id, name, phone),
        services (id, title, price)
      `)
      .eq('user_id', req.userId)
      .gte('date_time', periodStart.toISOString())
      .lte('date_time', now.toISOString());

    if (currentError) {
      console.error('Analytics current period error:', currentError);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }

    // Fetch previous period for comparison
    const { data: previousAppointments, error: previousError } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        services (price)
      `)
      .eq('user_id', req.userId)
      .eq('status', 'completed')
      .gte('date_time', previousPeriodStart.toISOString())
      .lt('date_time', periodStart.toISOString());

    if (previousError) {
      console.error('Analytics previous period error:', previousError);
    }

    // Calculate total revenue for current period
    const completedCurrent = currentAppointments.filter(a => a.status === 'completed');
    const currentRevenue = completedCurrent.reduce(
      (sum, a) => sum + (a.services ? parseFloat(a.services.price || 0) : 0),
      0
    );

    // Previous period revenue
    const previousRevenue = (previousAppointments || []).reduce(
      (sum, a) => sum + (a.services ? parseFloat(a.services.price || 0) : 0),
      0
    );

    const changePercent = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    // Revenue by service
    const serviceRevenueMap = new Map();
    completedCurrent.forEach(a => {
      if (a.services) {
        const key = a.service_id;
        const existing = serviceRevenueMap.get(key) || {
          serviceId: a.service_id,
          title: a.services.title,
          revenue: 0,
          count: 0
        };
        existing.revenue += parseFloat(a.services.price || 0);
        existing.count++;
        serviceRevenueMap.set(key, existing);
      }
    });
    const revenueByService = Array.from(serviceRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    // Top clients
    const clientRevenueMap = new Map();
    completedCurrent.forEach(a => {
      if (a.clients) {
        const key = a.client_id;
        const existing = clientRevenueMap.get(key) || {
          clientId: a.client_id,
          name: a.clients.name,
          phone: a.clients.phone,
          revenue: 0,
          appointmentCount: 0
        };
        existing.revenue += a.services ? parseFloat(a.services.price || 0) : 0;
        existing.appointmentCount++;
        clientRevenueMap.set(key, existing);
      }
    });
    const topClients = Array.from(clientRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Completion rate
    const totalAppointments = currentAppointments.length;
    const completedCount = currentAppointments.filter(a => a.status === 'completed').length;
    const cancelledCount = currentAppointments.filter(a => a.status === 'cancelled').length;
    const pendingCount = currentAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length;

    // Busiest days
    const dayCount = {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0
    };
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    currentAppointments
      .filter(a => a.status !== 'cancelled')
      .forEach(a => {
        const day = new Date(a.date_time).getDay();
        dayCount[dayNames[day]]++;
      });

    res.json({
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      },
      revenue: {
        total: currentRevenue,
        previousPeriod: previousRevenue,
        changePercent: Math.round(changePercent * 10) / 10
      },
      revenueByService,
      topClients,
      completionRate: {
        completed: totalAppointments > 0 ? Math.round((completedCount / totalAppointments) * 100) : 0,
        cancelled: totalAppointments > 0 ? Math.round((cancelledCount / totalAppointments) * 100) : 0,
        pending: totalAppointments > 0 ? Math.round((pendingCount / totalAppointments) * 100) : 0,
        total: totalAppointments
      },
      busiestDays: dayCount
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/inactive-clients - Get clients with no recent appointments
router.get('/inactive-clients', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days) || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInt);

    // Get all clients for this user
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('user_id', req.userId);

    if (clientsError) {
      console.error('Fetch clients error:', clientsError);
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    // Get last appointment for each client
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('client_id, date_time')
      .eq('user_id', req.userId)
      .neq('status', 'cancelled')
      .order('date_time', { ascending: false });

    if (appointmentsError) {
      console.error('Fetch appointments error:', appointmentsError);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }

    // Map client_id to last appointment date
    const lastAppointmentMap = new Map();
    appointments.forEach(a => {
      if (!lastAppointmentMap.has(a.client_id)) {
        lastAppointmentMap.set(a.client_id, a.date_time);
      }
    });

    // Find inactive clients
    const now = new Date();
    const inactiveClients = clients
      .map(client => {
        const lastAppointment = lastAppointmentMap.get(client.id);
        const daysSinceVisit = lastAppointment
          ? Math.floor((now.getTime() - new Date(lastAppointment).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;

        return {
          ...client,
          lastAppointment: lastAppointment || null,
          daysSinceVisit: lastAppointment ? daysSinceVisit : -1 // -1 means never visited
        };
      })
      .filter(client => {
        // Include if never had appointment or last appointment was before cutoff
        if (!client.lastAppointment) return true;
        return new Date(client.lastAppointment) < cutoffDate;
      })
      .sort((a, b) => {
        // Sort: never visited first, then by days since visit descending
        if (a.daysSinceVisit === -1 && b.daysSinceVisit === -1) return 0;
        if (a.daysSinceVisit === -1) return -1;
        if (b.daysSinceVisit === -1) return 1;
        return b.daysSinceVisit - a.daysSinceVisit;
      });

    res.json({
      clients: inactiveClients,
      count: inactiveClients.length
    });
  } catch (error) {
    console.error('Inactive clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
