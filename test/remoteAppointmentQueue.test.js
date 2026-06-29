const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const RemoteAppointmentQueue = require('../src/helpers/remoteAppointmentQueue');

test('remote queue stores pending appointment events', () => {
  const queuePath = path.join(__dirname, '..', 'src', 'data', 'remote-appointment-queue.json');
  if (fs.existsSync(queuePath)) fs.writeFileSync(queuePath, '[]', 'utf8');

  const queue = new RemoteAppointmentQueue();
  const item = queue.enqueueRemote({ payload: { cliente_nombre: 'Marta' } });

  assert.equal(item.status, 'pending');
  assert.ok(item.id);

  const pending = queue.listPending();
  assert.equal(pending.length, 1);
  assert.ok(queue.markProcessed(item.id));
});

test('remote queue can process all pending items in bulk', () => {
  const queuePath = path.join(__dirname, '..', 'src', 'data', 'remote-appointment-queue.json');
  if (fs.existsSync(queuePath)) fs.writeFileSync(queuePath, '[]', 'utf8');

  const queue = new RemoteAppointmentQueue();
  queue.enqueueRemote({ payload: { cliente_nombre: 'Lucia' } });
  queue.enqueueRemote({ payload: { cliente_nombre: 'Pedro' } });

  const processed = queue.processPending();
  assert.equal(processed, 2);
  assert.equal(queue.listPending().length, 0);
});
