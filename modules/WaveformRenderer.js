// ========================================
// WAVEFORM RENDERER - Oscilloscope Display
// ========================================

class WaveformRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.animationId = null;
    this.enabled = true;

    // Waveform parameters
    this.points = [];
    this.pointCount = 100;
    this.time = 0;
    this.baseAmplitude = 0.3;
    this.noiseAmount = 0.15;
    this.spikeDecay = 0.92;
    this.currentSpike = 0;

    // Visual settings
    this.primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color').trim() || '#00ff88';
    this.glowIntensity = 15;

    // Initialize points
    this.initPoints();

    // FPS control (30fps)
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / 30;
  }

  initPoints() {
    this.points = [];
    for (let i = 0; i < this.pointCount; i++) {
      this.points.push(0);
    }
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  updateColors() {
    this.primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color').trim() || '#00ff88';
  }

  // Trigger a spike (called on keyboard input)
  triggerSpike(intensity = 1) {
    this.currentSpike = Math.min(1, this.currentSpike + 0.5 * intensity);
  }

  generateWaveform() {
    const height = this.canvas.height;
    const centerY = height / 2;

    // Decay the spike
    this.currentSpike *= this.spikeDecay;

    // Generate new waveform values
    this.time += 0.1;

    for (let i = 0; i < this.pointCount; i++) {
      const x = i / this.pointCount;

      // Base sine waves at different frequencies
      let value = Math.sin(this.time + x * 10) * 0.3;
      value += Math.sin(this.time * 1.5 + x * 15) * 0.2;
      value += Math.sin(this.time * 0.7 + x * 5) * 0.15;

      // Add noise
      value += (Math.random() - 0.5) * this.noiseAmount;

      // Add spike effect
      if (this.currentSpike > 0.01) {
        const spikePosition = (this.time * 2) % 1;
        const distFromSpike = Math.abs(x - spikePosition);
        if (distFromSpike < 0.2) {
          const spikeFactor = (1 - distFromSpike / 0.2) * this.currentSpike;
          value += (Math.random() - 0.5) * spikeFactor * 1.5;
        }
      }

      // Scale to canvas height
      this.points[i] = centerY + value * (height * 0.4);
    }
  }

  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear with slight trail effect
    ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Draw center line (dim)
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.1);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw waveform with glow
    ctx.beginPath();
    ctx.moveTo(0, this.points[0]);

    for (let i = 1; i < this.pointCount; i++) {
      const x = (i / this.pointCount) * width;
      ctx.lineTo(x, this.points[i]);
    }

    // Glow effect
    ctx.strokeStyle = this.primaryColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.primaryColor;
    ctx.shadowBlur = this.glowIntensity;
    ctx.stroke();

    // Draw again without shadow for crispness
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw edge markers
    this.drawEdgeMarkers(ctx, width, height);
  }

  drawEdgeMarkers(ctx, width, height) {
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.5);
    ctx.font = '8px "Share Tech Mono"';

    // Left side scale markers
    const levels = [-0.5, 0, 0.5];
    levels.forEach(level => {
      const y = height / 2 - level * height * 0.4;
      ctx.fillRect(0, y - 1, 3, 2);
    });

    // Right side scale markers
    levels.forEach(level => {
      const y = height / 2 - level * height * 0.4;
      ctx.fillRect(width - 3, y - 1, 3, 2);
    });
  }

  animate(currentTime) {
    if (!this.enabled) return;

    // FPS throttling
    if (currentTime - this.lastFrameTime < this.frameInterval) {
      this.animationId = requestAnimationFrame((t) => this.animate(t));
      return;
    }
    this.lastFrameTime = currentTime;

    this.generateWaveform();
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  start() {
    if (!this.canvas || this.animationId) return;
    this.enabled = true;
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  stop() {
    this.enabled = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled && !this.animationId) {
      this.start();
    } else if (!enabled) {
      this.stop();
    }
  }
}

// Export for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WaveformRenderer;
}
