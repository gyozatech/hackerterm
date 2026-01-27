// ========================================
// DATA STREAM MANAGER - Fake Data Generator
// ========================================

class DataStreamManager {
  constructor(options = {}) {
    this.streamContainer = document.getElementById(options.streamContainerId || 'data-stream');
    this.satelliteList = document.getElementById(options.satelliteListId || 'satellite-list');
    this.streamRateEl = document.getElementById(options.streamRateId || 'stream-rate');

    this.maxLines = options.maxLines || 100;
    this.updateInterval = options.updateInterval || 500;
    this.intervalId = null;
    this.byteCount = 0;
    this.lastByteUpdate = Date.now();

    // Data templates
    this.ipRanges = [
      '192.168.', '10.0.', '172.16.', '203.0.113.', '198.51.100.',
      '45.33.', '104.236.', '159.89.', '167.99.', '206.189.'
    ];

    this.protocols = ['TCP', 'UDP', 'ICMP', 'SSH', 'HTTPS', 'DNS'];
    this.ports = [22, 80, 443, 8080, 3306, 5432, 6379, 27017, 8443, 9000];
    this.actions = ['INTERCEPT', 'FORWARD', 'BLOCKED', 'ANALYZED', 'REDIRECT'];

    this.systemEvents = [
      'Firewall: Connection established',
      'Firewall: Port scan detected',
      'Auth: Login attempt',
      'Auth: Session validated',
      'Network: Packet inspection complete',
      'Network: Route optimization',
      'Crypto: Key rotation initiated',
      'Crypto: Cipher negotiation',
      'System: Memory cleanup',
      'System: Thread pool resized',
      'IDS: Signature match',
      'IDS: Anomaly detected'
    ];

    this.alertMessages = [
      'INTRUSION DETECTED - Source blocked',
      'ANOMALY: Unusual traffic pattern',
      'BREACH ATTEMPT: Perimeter scan',
      'ALERT: Unauthorized access attempt',
      'WARNING: Encryption downgrade attempt',
      'CRITICAL: Certificate validation failed'
    ];
  }

  generateIP() {
    const range = this.ipRanges[Math.floor(Math.random() * this.ipRanges.length)];
    return range + Math.floor(Math.random() * 256) + '.' + Math.floor(Math.random() * 256);
  }

  generateNetworkLine() {
    const proto = this.protocols[Math.floor(Math.random() * this.protocols.length)];
    const srcIP = this.generateIP();
    const dstIP = this.generateIP();
    const port = this.ports[Math.floor(Math.random() * this.ports.length)];
    const action = this.actions[Math.floor(Math.random() * this.actions.length)];
    const bytes = Math.floor(Math.random() * 8192) + 64;

    this.byteCount += bytes;

    return {
      type: 'network',
      tag: proto,
      tagClass: proto === 'UDP' ? 'tag-udp' : 'tag-tcp',
      content: `${srcIP} → ${dstIP}:${port} ${action} ${bytes}B`
    };
  }

  generateSystemLine() {
    const event = this.systemEvents[Math.floor(Math.random() * this.systemEvents.length)];
    const timestamp = this.getTimestamp();

    return {
      type: 'system',
      tag: 'SYS',
      tagClass: 'tag-tcp',
      content: `${timestamp} ${event}`
    };
  }

  generateAlertLine() {
    const alert = this.alertMessages[Math.floor(Math.random() * this.alertMessages.length)];
    const timestamp = this.getTimestamp();

    return {
      type: 'alert',
      tag: 'ALERT',
      tagClass: 'tag-alert',
      content: `${timestamp} ${alert}`
    };
  }

  generateEncryptedLine() {
    const bytes = [];
    const length = 16 + Math.floor(Math.random() * 16);
    for (let i = 0; i < length; i++) {
      bytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
    }

    const ciphers = ['AES-256', 'RSA-4096', 'ECDSA', 'ChaCha20'];
    const cipher = ciphers[Math.floor(Math.random() * ciphers.length)];

    return {
      type: 'encrypted',
      tag: cipher,
      tagClass: 'tag-enc',
      content: bytes.join(' ')
    };
  }

  getTimestamp() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }

  generateLine() {
    const rand = Math.random();

    if (rand < 0.5) {
      return this.generateNetworkLine();
    } else if (rand < 0.75) {
      return this.generateSystemLine();
    } else if (rand < 0.9) {
      return this.generateEncryptedLine();
    } else {
      return this.generateAlertLine();
    }
  }

  addLine(lineData) {
    if (!this.streamContainer) return;

    const line = document.createElement('div');
    line.className = `stream-line ${lineData.type}`;

    const tag = document.createElement('span');
    tag.className = `stream-tag ${lineData.tagClass}`;
    tag.textContent = lineData.tag;

    line.appendChild(tag);
    line.appendChild(document.createTextNode(lineData.content));

    this.streamContainer.appendChild(line);

    // Remove old lines
    while (this.streamContainer.children.length > this.maxLines) {
      this.streamContainer.removeChild(this.streamContainer.firstChild);
    }

    // Auto-scroll
    this.streamContainer.scrollTop = this.streamContainer.scrollHeight;
  }

  updateStreamRate() {
    if (!this.streamRateEl) return;

    const now = Date.now();
    const elapsed = (now - this.lastByteUpdate) / 1000;

    if (elapsed >= 1) {
      const rate = this.byteCount / elapsed;
      let rateStr;

      if (rate > 1024 * 1024) {
        rateStr = (rate / (1024 * 1024)).toFixed(1) + ' MB/s';
      } else if (rate > 1024) {
        rateStr = (rate / 1024).toFixed(1) + ' KB/s';
      } else {
        rateStr = Math.round(rate) + ' B/s';
      }

      this.streamRateEl.textContent = rateStr;
      this.byteCount = 0;
      this.lastByteUpdate = now;
    }
  }

  updateSatelliteList(satellites) {
    if (!this.satelliteList) return;

    this.satelliteList.innerHTML = '';

    satellites.forEach(sat => {
      const item = document.createElement('div');
      item.className = 'satellite-item';

      item.innerHTML = `
        <span class="sat-indicator"></span>
        <span class="sat-name">${sat.id}</span>
        <span class="sat-coords">${sat.lat}/${sat.lon} ${sat.alt}km</span>
      `;

      this.satelliteList.appendChild(item);
    });
  }

  start() {
    if (this.intervalId) return;

    // Generate initial lines
    for (let i = 0; i < 20; i++) {
      this.addLine(this.generateLine());
    }

    // Start continuous generation
    this.intervalId = setInterval(() => {
      // Generate 1-3 lines per interval
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        this.addLine(this.generateLine());
      }
      this.updateStreamRate();
    }, this.updateInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  clear() {
    if (this.streamContainer) {
      this.streamContainer.innerHTML = '';
    }
  }
}

// Export for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStreamManager;
}
