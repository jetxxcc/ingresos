const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const AppointmentSyncHelper = require('../src/helpers/appointmentSyncHelper');
const { initializeAppointmentTables } = require('../src/helpers/appointmentsHelper');

test('queue stores pending appointment events and processes them', async () => {
  const tmpDbPath = path.join(__dirname, 'tmp-sync.db');
  const queuePath = path.join(__dirname, '..', 'src', 'data', 'appointment-sync-queue.json');
  if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
  if (fs.existsSync(queuePath)) fs.writeFileSync(queuePath, '[]', 'utf8');

  const db = new sqlite3.Database(tmpDbPath);
  try {
    await initializeAppointmentTables(db);
    const sync = new AppointmentSyncHelper(db);

    sync.enqueueAppointment({
      action: 'create',
      payload: {
        cliente_nombre: 'Carlos',
        cliente_telefono: '111',
        empleado_id: 1,
        fecha_hora: '2026-08-01 09:00:00',
        duracion_minutos: 30,
        estado: 'pendiente'
      }
    });

    const processed = await sync.processQueue();
    assert.equal(processed, 1, 'Debe procesar un evento pendiente');
  } finally {
    await new Promise((resolve, reject) => db.close((err) => err ? reject(err) : resolve()));
    if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
  }
});

test('manual queue processing exposes a helper entrypoint', async () => {
  const tmpDbPath = path.join(__dirname, 'tmp-sync-manual.db');
  const queuePath = path.join(__dirname, '..', 'src', 'data', 'appointment-sync-queue.json');
  if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
  if (fs.existsSync(queuePath)) fs.writeFileSync(queuePath, '[]', 'utf8');

  const db = new sqlite3.Database(tmpDbPath);
  try {
    await initializeAppointmentTables(db);
    const sync = new AppointmentSyncHelper(db);

    sync.enqueueAppointment({
      action: 'create',
      payload: {
        cliente_nombre: 'Ana',
        cliente_telefono: '222',
        empleado_id: 2,
        fecha_hora: '2026-08-02 10:00:00',
        duracion_minutos: 45,
        estado: 'pendiente'
      }
    });

    const processed = await sync.processPendingQueue();
    assert.equal(processed, 1, 'Debe exponer un punto de entrada para procesar manualmente');
  } finally {
    await new Promise((resolve, reject) => db.close((err) => err ? reject(err) : resolve()));
    if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
  }
});
