const path = require('path');

async function initializeAppointmentTables(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente_nombre TEXT NOT NULL,
          cliente_telefono TEXT,
          empleado_id INTEGER NOT NULL,
          fecha_hora TEXT NOT NULL,
          duracion_minutos INTEGER NOT NULL DEFAULT 30,
          estado TEXT NOT NULL DEFAULT 'pendiente',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sync_status TEXT DEFAULT 'pending',
          remote_id TEXT,
          FOREIGN KEY (empleado_id) REFERENCES employees(id)
        )
      `, (err) => {
        if (err) return reject(err);
        db.run(`CREATE INDEX IF NOT EXISTS idx_appointments_empleado_fecha ON appointments(empleado_id, fecha_hora)`, (indexErr) => {
          if (indexErr) return reject(indexErr);
          resolve();
        });
      });
    });
  });
}

async function createAppointment(db, data) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO appointments (
        cliente_nombre, cliente_telefono, empleado_id, fecha_hora, duracion_minutos, estado, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      data.cliente_nombre,
      data.cliente_telefono || '',
      data.empleado_id,
      data.fecha_hora,
      data.duracion_minutos || 30,
      data.estado || 'pendiente',
      'pending'
    ], function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

async function listAppointments(db, filters = {}) {
  return new Promise((resolve, reject) => {
    const conditions = [];
    const params = [];

    if (filters.fecha) {
      conditions.push(`date(fecha_hora) = ?`);
      params.push(filters.fecha);
    }

    if (filters.empleado_id) {
      conditions.push(`empleado_id = ?`);
      params.push(filters.empleado_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    db.all(`
      SELECT id, cliente_nombre, cliente_telefono, empleado_id, fecha_hora, duracion_minutos, estado, sync_status
      FROM appointments
      ${whereClause}
      ORDER BY fecha_hora ASC
    `, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function findAppointmentConflict(db, empleadoId, fechaHora, duracionMinutos, excludeId = null) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, fecha_hora, duracion_minutos
      FROM appointments
      WHERE empleado_id = ?
        AND estado != 'cancelada'
        AND id != COALESCE(?, -1)
        AND datetime(?) < datetime(fecha_hora, '+' || duracion_minutos || ' minutes')
        AND datetime(fecha_hora) < datetime(?, '+' || ? || ' minutes')
      ORDER BY fecha_hora
      LIMIT 1
    `;

    db.get(sql, [empleadoId, excludeId, fechaHora, fechaHora, duracionMinutos.toString()], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

async function updateAppointment(db, appointmentId, data) {
  return new Promise((resolve, reject) => {
    const fields = [];
    const values = [];

    if (data.fecha_hora) {
      fields.push('fecha_hora = ?');
      values.push(data.fecha_hora);
    }

    if (data.estado) {
      fields.push('estado = ?');
      values.push(data.estado);
    }

    if (data.cliente_nombre) {
      fields.push('cliente_nombre = ?');
      values.push(data.cliente_nombre);
    }

    if (data.cliente_telefono !== undefined) {
      fields.push('cliente_telefono = ?');
      values.push(data.cliente_telefono);
    }

    if (fields.length === 0) {
      return resolve(appointmentId);
    }

    values.push(appointmentId);
    const sql = `UPDATE appointments SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve(this.changes > 0 ? appointmentId : null);
    });
  });
}

async function cancelAppointment(db, appointmentId) {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE appointments SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [appointmentId], function (err) {
      if (err) return reject(err);
      resolve(this.changes > 0);
    });
  });
}

module.exports = {
  initializeAppointmentTables,
  createAppointment,
  listAppointments,
  findAppointmentConflict,
  updateAppointment,
  cancelAppointment
};
