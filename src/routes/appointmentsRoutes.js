const express = require('express');
const router = express.Router();
const db = require('../models/db.js');
const { initializeAppointmentTables, createAppointment, listAppointments, findAppointmentConflict, updateAppointment, cancelAppointment } = require('../helpers/appointmentsHelper');
const AppointmentSyncHelper = require('../helpers/appointmentSyncHelper');
const RemoteAppointmentQueue = require('../helpers/remoteAppointmentQueue');

router.use(async (req, res, next) => {
  try {
    await initializeAppointmentTables(db);
    next();
  } catch (error) {
    console.error('Error inicializando citas:', error);
    res.status(500).send('Error inicializando módulo de citas');
  }
});

const syncHelper = new AppointmentSyncHelper(db);
const remoteQueue = new RemoteAppointmentQueue();

router.get('/citas', async (req, res) => {
  try {
    const fecha = req.query.fecha || '';
    const empleado_id = req.query.empleado_id || '';
    const filters = {};

    if (fecha) filters.fecha = fecha;
    if (empleado_id) filters.empleado_id = Number(empleado_id);

    const appointments = await listAppointments(db, filters);
    const empleados = await new Promise((resolve, reject) => {
      db.all(`SELECT id, name FROM employees ORDER BY name`, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    res.render('index', {
      title: 'Citas',
      activePage: '/citas',
      is_admin: req.session.is_admin || false,
      template: 'appointments',
      appointments,
      empleados,
      filtros: { fecha, empleado_id }
    });
  } catch (error) {
    console.error('Error listando citas:', error);
    res.status(500).send('Error al cargar citas');
  }
});

router.get('/api/citas/sync-status', (req, res) => {
  const localPending = syncHelper.readQueue ? syncHelper.readQueue().filter((item) => item.status === 'pending') : [];
  const remotePending = remoteQueue.listPending ? remoteQueue.listPending() : [];

  res.json({
    ok: true,
    localPending: localPending.length,
    remotePending: remotePending.length,
    localQueue: localPending,
    remoteQueue: remotePending
  });
});

router.get('/api/citas/resumen-diario', async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    const rows = await new Promise((resolve, reject) => {
      db.all(`
        SELECT date(fecha_hora) as fecha, COUNT(*) as total, SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas
        FROM appointments
        WHERE date(fecha_hora) = ?
        GROUP BY date(fecha_hora)
      `, [fecha], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    res.json({ ok: true, fecha, resumen: rows[0] || { fecha, total: 0, canceladas: 0 } });
  } catch (error) {
    console.error('Error generando resumen diario:', error);
    res.status(500).json({ error: 'No se pudo generar el resumen' });
  }
});

router.get('/api/citas/proximas', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 5);
    const rows = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, cliente_nombre, empleado_id, fecha_hora, estado
        FROM appointments
        WHERE estado != 'cancelada' AND datetime(fecha_hora) >= datetime('now')
        ORDER BY fecha_hora ASC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    res.json({ ok: true, citas: rows });
  } catch (error) {
    console.error('Error generando próximas citas:', error);
    res.status(500).json({ error: 'No se pudo generar el resumen' });
  }
});

router.get('/api/citas/resumen-empleados', async (req, res) => {
  try {
    const fecha = req.query.fecha || '';
    const whereClause = fecha ? `WHERE date(fecha_hora) = ?` : '';
    const params = fecha ? [fecha] : [];

    const rows = await new Promise((resolve, reject) => {
      db.all(`
        SELECT a.empleado_id, e.name AS empleado_nombre, COUNT(*) AS total
        FROM appointments a
        LEFT JOIN employees e ON e.id = a.empleado_id
        ${whereClause}
        GROUP BY a.empleado_id, e.name
        ORDER BY total DESC, e.name ASC
      `, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    res.json({ ok: true, resumen: rows });
  } catch (error) {
    console.error('Error generando resumen por empleado:', error);
    res.status(500).json({ error: 'No se pudo generar el resumen' });
  }
});

router.get('/api/citas/semana', async (req, res) => {
  try {
    const startDate = req.query.start || new Date().toISOString().slice(0, 10);
    const rows = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, cliente_nombre, empleado_id, fecha_hora, estado
        FROM appointments
        WHERE date(fecha_hora) BETWEEN date(?) AND date(?, '+6 days')
        AND estado != 'cancelada'
        ORDER BY fecha_hora ASC
      `, [startDate, startDate], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    res.json({ ok: true, citas: rows, startDate });
  } catch (error) {
    console.error('Error generando vista semanal:', error);
    res.status(500).json({ error: 'No se pudo generar la vista semanal' });
  }
});

router.post('/api/citas/sync-now', async (req, res) => {
  try {
    const localProcessed = await syncHelper.processPendingQueue();
    const remoteProcessed = remoteQueue.processPending();

    res.json({ ok: true, processed: localProcessed + remoteProcessed, localProcessed, remoteProcessed });
  } catch (error) {
    console.error('Error procesando cola:', error);
    res.status(500).json({ error: 'No se pudo procesar la cola' });
  }
});

router.get('/reservar-cita', async (req, res) => {
  try {
    const appointments = await listAppointments(db);
    const empleados = await new Promise((resolve, reject) => {
      db.all(`SELECT id, name FROM employees ORDER BY name`, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    res.render('public-appointment', { error: null, success: null, appointments, empleados });
  } catch (error) {
    console.error('Error cargando vista pública:', error);
    res.status(500).send('Error al cargar la vista de reserva');
  }
});

router.post('/api/reservar-cita', async (req, res) => {
  try {
    const { cliente_nombre, cliente_telefono, empleado_id, fecha_hora, duracion_minutos } = req.body;

    if (!cliente_nombre || !empleado_id || !fecha_hora) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const conflict = await findAppointmentConflict(db, empleado_id, fecha_hora, Number(duracion_minutos || 30));
    if (conflict) {
      return res.status(409).json({ error: 'El empleado ya tiene una cita en ese horario' });
    }

    const appointmentId = await createAppointment(db, {
      cliente_nombre,
      cliente_telefono,
      empleado_id,
      fecha_hora,
      duracion_minutos: Number(duracion_minutos || 30),
      estado: 'pendiente'
    });

    syncHelper.enqueueAppointment({
      action: 'create',
      payload: {
        cliente_nombre,
        cliente_telefono,
        empleado_id,
        fecha_hora,
        duracion_minutos: Number(duracion_minutos || 30),
        estado: 'pendiente'
      }
    });

    remoteQueue.enqueueRemote({
      payload: {
        cliente_nombre,
        cliente_telefono,
        empleado_id,
        fecha_hora,
        duracion_minutos: Number(duracion_minutos || 30),
        estado: 'pendiente'
      }
    });

    res.json({ success: true, id: appointmentId });
  } catch (error) {
    console.error('Error reservando cita:', error);
    res.status(500).json({ error: 'No se pudo reservar la cita' });
  }
});

router.post('/api/citas', async (req, res) => {
  try {
    const { cliente_nombre, cliente_telefono, empleado_id, fecha_hora, duracion_minutos } = req.body;

    if (!cliente_nombre || !empleado_id || !fecha_hora) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const conflict = await findAppointmentConflict(db, empleado_id, fecha_hora, Number(duracion_minutos || 30));
    if (conflict) {
      return res.status(409).json({ error: 'El empleado ya tiene una cita en ese horario' });
    }

    const appointmentId = await createAppointment(db, {
      cliente_nombre,
      cliente_telefono,
      empleado_id,
      fecha_hora,
      duracion_minutos: Number(duracion_minutos || 30),
      estado: 'pendiente'
    });

    syncHelper.enqueueAppointment({
      action: 'create',
      payload: {
        cliente_nombre,
        cliente_telefono,
        empleado_id,
        fecha_hora,
        duracion_minutos: Number(duracion_minutos || 30),
        estado: 'pendiente'
      }
    });

    remoteQueue.enqueueRemote({
      payload: {
        cliente_nombre,
        cliente_telefono,
        empleado_id,
        fecha_hora,
        duracion_minutos: Number(duracion_minutos || 30),
        estado: 'pendiente'
      }
    });

    res.json({ success: true, id: appointmentId });
  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

router.put('/api/citas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_hora, duracion_minutos, estado } = req.body;

    if (!fecha_hora && !estado) {
      return res.status(400).json({ error: 'No hay cambios para aplicar' });
    }

    const duracion = Number(duracion_minutos || 30);
    const existing = await listAppointments(db);
    const appointment = existing.find(item => item.id === Number(id));
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (fecha_hora) {
      const conflict = await findAppointmentConflict(db, appointment.empleado_id, fecha_hora, duracion, Number(id));
      if (conflict) {
        return res.status(409).json({ error: 'El empleado ya tiene una cita en ese horario' });
      }
    }

    const updatedId = await updateAppointment(db, Number(id), {
      fecha_hora,
      estado,
      duracion_minutos: duracion
    });

    syncHelper.enqueueAppointment({
      action: 'update',
      payload: {
        id: Number(id),
        changes: {
          fecha_hora,
          estado,
          duracion_minutos: duracion
        }
      }
    });

    remoteQueue.enqueueRemote({
      payload: {
        id: Number(id),
        changes: {
          fecha_hora,
          estado,
          duracion_minutos: duracion
        }
      }
    });

    res.json({ success: true, id: updatedId });
  } catch (error) {
    console.error('Error actualizando cita:', error);
    res.status(500).json({ error: 'No se pudo actualizar la cita' });
  }
});

router.delete('/api/citas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cancelled = await cancelAppointment(db, Number(id));

    if (cancelled) {
      syncHelper.enqueueAppointment({
        action: 'cancel',
        payload: { id: Number(id) }
      });

      remoteQueue.enqueueRemote({
        payload: { id: Number(id), action: 'cancel' }
      });
    }

    res.json({ success: cancelled, cancelled });
  } catch (error) {
    console.error('Error cancelando cita:', error);
    res.status(500).json({ error: 'No se pudo cancelar la cita' });
  }
});

module.exports = router;
