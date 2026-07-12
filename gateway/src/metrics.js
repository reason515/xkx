/** Simple metrics for monitoring (phase 5). */

export class Metrics {
  constructor() {
    this.startedAt = Date.now();
    this.connections = 0;
    this.totalConnections = 0;
    this.errors = 0;
    this.commands = 0;
    this.registerAttempts = new Map();
  }

  incConnections() {
    this.connections++;
    this.totalConnections++;
  }

  decConnections() {
    if (this.connections > 0) this.connections--;
  }

  incError() {
    this.errors++;
  }

  incCommands() {
    this.commands++;
  }

  canRegister(ip, maxPerHour) {
    const now = Date.now();
    const list = (this.registerAttempts.get(ip) || []).filter(
      (t) => now - t < 3600000
    );
    this.registerAttempts.set(ip, list);
    return list.length < maxPerHour;
  }

  recordRegister(ip) {
    const list = this.registerAttempts.get(ip) || [];
    list.push(Date.now());
    this.registerAttempts.set(ip, list);
  }

  snapshot() {
    return {
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      connections: this.connections,
      totalConnections: this.totalConnections,
      errors: this.errors,
      commands: this.commands,
    };
  }
}
