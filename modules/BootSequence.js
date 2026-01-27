// ========================================
// BOOT SEQUENCE - Startup Animation
// ========================================

class BootSequence {
  constructor(options = {}) {
    this.bootScreen = document.getElementById(options.bootScreenId || 'boot-screen');
    this.bootOutput = document.getElementById(options.bootOutputId || 'boot-output');
    this.onComplete = options.onComplete || (() => {});

    this.bootMessages = [
      { text: 'INITIALIZING SECURE TERMINAL...', delay: 100, type: 'header' },
      { text: '> LOADING KERNEL MODULES...', delay: 300, type: 'section' },
      { text: '  [OK] crypto_aes_256', delay: 150, type: 'success' },
      { text: '  [OK] network_secure', delay: 120, type: 'success' },
      { text: '  [OK] firewall_core', delay: 100, type: 'success' },
      { text: '  [OK] intrusion_detect', delay: 130, type: 'success' },
      { text: '> ESTABLISHING SECURE CONNECTION...', delay: 400, type: 'section' },
      { text: '  Handshake: TLS 1.3', delay: 200, type: 'info' },
      { text: '  Cipher: AES-256-GCM', delay: 150, type: 'info' },
      { text: '  [OK] CONNECTION ESTABLISHED', delay: 250, type: 'success' },
      { text: '> LOADING SATELLITE UPLINK...', delay: 350, type: 'section' },
      { text: '  Scanning orbital frequencies...', delay: 300, type: 'info' },
      { text: '  [OK] 8 SATELLITES ONLINE', delay: 200, type: 'success' },
      { text: '> INITIALIZING DATA STREAMS...', delay: 300, type: 'section' },
      { text: '  [OK] Network interceptor ready', delay: 150, type: 'success' },
      { text: '  [OK] Packet analyzer online', delay: 120, type: 'success' },
      { text: '> SYSTEM CHECK COMPLETE', delay: 400, type: 'section' },
      { text: '', delay: 200, type: 'blank' },
      { text: 'ACCESS GRANTED. WELCOME, OPERATOR.', delay: 100, type: 'final' }
    ];
  }

  async run() {
    if (!this.bootOutput) {
      this.onComplete();
      return;
    }

    this.bootOutput.innerHTML = '';

    for (const msg of this.bootMessages) {
      await this.delay(msg.delay);
      this.addLine(msg.text, msg.type);
    }

    // Wait a moment then hide boot screen
    await this.delay(800);
    this.hide();
  }

  addLine(text, type) {
    const line = document.createElement('div');
    line.className = 'boot-line';

    // Apply different styling based on type
    switch (type) {
      case 'header':
        line.style.color = 'var(--primary-color)';
        line.style.fontSize = '16px';
        line.style.marginBottom = '10px';
        break;
      case 'section':
        line.style.color = 'var(--primary-color)';
        line.style.marginTop = '8px';
        break;
      case 'success':
        line.style.color = 'var(--primary-color)';
        line.style.paddingLeft = '10px';
        break;
      case 'info':
        line.style.color = 'var(--secondary-color)';
        line.style.paddingLeft = '10px';
        line.style.opacity = '0.8';
        break;
      case 'warning':
        line.style.color = 'var(--warning-color)';
        break;
      case 'final':
        line.style.color = 'var(--primary-color)';
        line.style.fontSize = '18px';
        line.style.marginTop = '20px';
        line.style.textShadow = '0 0 10px var(--primary-glow)';
        break;
      case 'blank':
        // Just a spacer
        break;
    }

    // Add OK/status badges
    if (text.includes('[OK]')) {
      const parts = text.split('[OK]');
      line.textContent = parts[0];

      const badge = document.createElement('span');
      badge.className = 'status ok';
      badge.textContent = 'OK';
      line.appendChild(badge);

      if (parts[1]) {
        line.appendChild(document.createTextNode(parts[1]));
      }
    } else if (text.includes('[WARN]')) {
      const parts = text.split('[WARN]');
      line.textContent = parts[0];

      const badge = document.createElement('span');
      badge.className = 'status warn';
      badge.textContent = 'WARN';
      line.appendChild(badge);

      if (parts[1]) {
        line.appendChild(document.createTextNode(parts[1]));
      }
    } else {
      line.textContent = text;
    }

    // Animate line appearing
    line.style.animation = `boot-line-appear 0.1s ease-out forwards`;

    this.bootOutput.appendChild(line);
    this.bootOutput.scrollTop = this.bootOutput.scrollHeight;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  hide() {
    if (this.bootScreen) {
      this.bootScreen.classList.add('hidden');

      // Remove from DOM after transition
      setTimeout(() => {
        if (this.bootScreen.parentNode) {
          this.bootScreen.style.display = 'none';
        }
        this.onComplete();
      }, 500);
    } else {
      this.onComplete();
    }
  }

  skip() {
    this.hide();
  }
}

// Export for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BootSequence;
}
