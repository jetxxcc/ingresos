const path = require('path');
const fs = require('fs');

class AppointmentSyncHelper {
  constructor(db) {
    this.db = db;
    this.queueFilePath = path.join(__dirname, '..', 'data', 'appointment-sync-queue.json');
    this.ensureQueueFile();
  }

  ensureQueueFile() {
    const dir = path.dirname(this.queueFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.queueFilePath)) {
      fs.writeFileSync(this.queueFilePath, '[]', 'utf8');
    }
  }

  readQueue() {
    const raw = fs.readFileSync(this.queueFilePath, 'utf8');
    return JSON.parse(raw);
  }

  writeQueue(queue) {
    fs.writeFileSync(this.queueFilePath, JSON.stringify(queue, null, 2), 'utf8');
  }

  enqueueAppointment(event) {
    const queue = this.readQueue();
    queue.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: 'appointment',
      action: event.action || 'create',
      payload: event.payload,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
    this.writeQueue(queue);
    return queue[queue.length - 1];
  }

  async processQueue() {
    return this.processPendingQueue();
  }

  async processPendingQueue() {
    const queue = this.readQueue();
    const pending = queue.filter((item) => item.status === 'pending');

    for (const item of pending) {
      try {
        if (item.type === 'appointment' && item.payload) {
          const { createAppointment, updateAppointment, cancelAppointment } = require('./appointmentsHelper');
          if (item.action === 'create') {
            await createAppointment(this.db, item.payload);
          } else if (item.action === 'update') {
            await updateAppointment(this.db, item.payload.id, item.payload.changes);
          } else if (item.action === 'cancel') {
            await cancelAppointment(this.db, item.payload.id);
          }
        }

        item.status = 'processed';
        item.processedAt = new Date().toISOString();
      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
      }
    }

    this.writeQueue(queue);
    return pending.length;
  }
}

module.exports = AppointmentSyncHelper;
