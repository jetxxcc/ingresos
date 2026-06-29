const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { initializeAppointmentTables, findAppointmentConflict, createAppointment, listAppointments, updateAppointment, cancelAppointment } = require('../src/helpers/appointmentsHelper');

test('initializeAppointmentTables creates appointments table and detects conflicts', async () => {
  const tmpDbPath = path.join(__dirname, 'tmp-appointments.db');
  if (fs.existsSync(tmpDbPath)) {
    fs.unlinkSync(tmpDbPath);
  }

  const db = new sqlite3.Database(tmpDbPath);

  try {
    await initializeAppointmentTables(db);

    await createAppointment(db, {
      cliente_nombre: 'Ana',
      cliente_telefono: '5551234',
      empleado_id: 1,
      fecha_hora: '2026-07-01 10:00:00',
      duracion_minutos: 30,
      estado: 'confirmada'
    });

    const conflict = await findAppointmentConflict(db, 1, '2026-07-01 10:15:00', 30);
    assert.ok(conflict, 'Debe detectar un conflicto de horario');

    const noConflict = await findAppointmentConflict(db, 1, '2026-07-01 11:00:00', 30);
    assert.equal(noConflict, null, 'No debería detectar conflicto cuando el horario está libre');

    const appointments = await listAppointments(db);
    assert.equal(appointments.length, 1, 'Debe listar la cita creada');

    const updatedId = await updateAppointment(db, 1, { fecha_hora: '2026-07-01 11:00:00' });
    assert.equal(updatedId, 1, 'Debe permitir reprogramar una cita');

    const cancelled = await cancelAppointment(db, 1);
    assert.equal(cancelled, true, 'Debe permitir cancelar una cita');
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    });

    if (fs.existsSync(tmpDbPath)) {
      fs.unlinkSync(tmpDbPath);
    }
  }
});

test('listAppointments supports filtering by date and employee', async () => {
  const tmpDbPath = path.join(__dirname, 'tmp-appointments-filter.db');
  if (fs.existsSync(tmpDbPath)) {
    fs.unlinkSync(tmpDbPath);
  }

  const db = new sqlite3.Database(tmpDbPath);

  try {
    await initializeAppointmentTables(db);

    await createAppointment(db, {
      cliente_nombre: 'Luis',
      empleado_id: 2,
      fecha_hora: '2026-07-02 09:00:00',
      duracion_minutos: 30,
      estado: 'pendiente'
    });

    await createAppointment(db, {
      cliente_nombre: 'Marta',
      empleado_id: 1,
      fecha_hora: '2026-07-02 10:00:00',
      duracion_minutos: 30,
      estado: 'pendiente'
    });

    const byDate = await listAppointments(db, { fecha: '2026-07-02' });
    assert.equal(byDate.length, 2, 'Debe filtrar por fecha');

    const byEmployee = await listAppointments(db, { empleado_id: 2 });
    assert.equal(byEmployee.length, 1, 'Debe filtrar por empleado');
    assert.equal(byEmployee[0].cliente_nombre, 'Luis');
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    });

    if (fs.existsSync(tmpDbPath)) {
      fs.unlinkSync(tmpDbPath);
    }
  }
});
