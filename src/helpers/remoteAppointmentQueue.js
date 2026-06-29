const fs = require('fs');
const path = require('path');

class RemoteAppointmentQueue {
  constructor() {
    this.queueFilePath = path.join(__dirname, '..', 'data', 'remote-appointment-queue.json');
    this.ensureQueueFile();
  }

  ensureQueueFile() {
    const dir = path.dirname(this.queueFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.queueFilePath)) fs.writeFileSync(this.queueFilePath, '[]', 'utf8');
  }

  readQueue() {
    return JSON.parse(fs.readFileSync(this.queueFilePath, 'utf8'));
  }

  writeQueue(queue) {
    fs.writeFileSync(this.queueFilePath, JSON.stringify(queue, null, 2), 'utf8');
  }

  enqueueRemote(event) {
    const queue = this.readQueue();
    queue.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      payload: event.payload,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    this.writeQueue(queue);
    return queue[queue.length - 1];
  }

  listPending() {
    return this.readQueue().filter((item) => item.status === 'pending');
  }

  processPending() {
    const queue = this.readQueue();
    const pending = queue.filter((item) => item.status === 'pending');

    pending.forEach((item) => {
      item.status = 'processed';
      item.processedAt = new Date().toISOString();
    });

    this.writeQueue(queue);
    return pending.length;
  }

  markProcessed(id) {
    const queue = this.readQueue();
    const item = queue.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = 'processed';
    item.processedAt = new Date().toISOString();
    this.writeQueue(queue);
    return true;
  }
}

module.exports = RemoteAppointmentQueue;
