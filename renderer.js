const { ipcRenderer, shell, clipboard } = require('electron');
const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ========================================
// SETTINGS PERSISTENCE
// ========================================

const settingsPath = path.join(os.homedir(), '.hackerterm-settings.json');

const defaultShortcuts = {
  'window.new': 'Ctrl+N',
  'tab.new': 'Ctrl+T',
  'tab.close': 'Ctrl+W',
  'tab.next': 'Ctrl+Right',
  'tab.prev': 'Ctrl+Left',
  'pane.splitVertical': 'Ctrl+Shift+D',
  'pane.splitHorizontal': 'Ctrl+Shift+E',
  'pane.close': 'Ctrl+Shift+W',
  'pane.focusNext': 'Ctrl+Tab',
  'pane.focusUp': 'Ctrl+Alt+Up',
  'pane.focusDown': 'Ctrl+Alt+Down',
  'pane.focusLeft': 'Ctrl+Alt+Left',
  'pane.focusRight': 'Ctrl+Alt+Right',
  'dataPanel.toggle': 'Ctrl+Shift+P',
  'settings.open': 'Ctrl+,',
  'stt.toggle': 'Ctrl+Shift+S',
};

const shortcutLabels = {
  'window.new': 'New Window',
  'tab.new': 'New Tab',
  'tab.close': 'Close Tab',
  'tab.next': 'Next Tab',
  'tab.prev': 'Previous Tab',
  'pane.splitVertical': 'Split Vertical',
  'pane.splitHorizontal': 'Split Horizontal',
  'pane.close': 'Close Pane',
  'pane.focusNext': 'Focus Next Pane',
  'pane.focusUp': 'Focus Pane Up',
  'pane.focusDown': 'Focus Pane Down',
  'pane.focusLeft': 'Focus Pane Left',
  'pane.focusRight': 'Focus Pane Right',
  'dataPanel.toggle': 'Toggle Data Panel',
  'settings.open': 'Open Settings',
  'stt.toggle': 'Speech-to-Text',
};

const defaultSettings = {
  theme: 'matrix',
  fontSize: 14,
  effectsEnabled: true,
  effectsIntensity: 50,
  glitchEnabled: true,
  glitchIntensity: 50,
  dataPanelVisible: true,
  typingSoundEnabled: true,
  typingSoundVolume: 30,
  shortcuts: { ...defaultShortcuts },
};

let currentSettings = { ...defaultSettings };

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const saved = JSON.parse(data);
      currentSettings = {
        ...defaultSettings,
        ...saved,
        shortcuts: { ...defaultShortcuts, ...(saved.shortcuts || {}) }
      };
    }
  } catch (e) {
    console.log('Could not load settings, using defaults');
    currentSettings = { ...defaultSettings };
  }
  return currentSettings;
}

function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
  } catch (e) {
    console.log('Could not save settings:', e);
  }
}

// Load settings immediately
loadSettings();

// ========================================
// CONTEXT MENU
// ========================================

class ContextMenu {
  constructor() {
    this.menu = null;
    this.currentTerminal = null;
    this.currentTerminalId = null;
    this.createMenu();
  }

  createMenu() {
    this.menu = document.createElement('div');
    this.menu.className = 'context-menu';
    this.menu.innerHTML = `
      <div class="context-menu-item" data-action="copy">
        <span>Copy</span>
        <span class="context-menu-icon">⌘C</span>
      </div>
      <div class="context-menu-item" data-action="paste">
        <span>Paste</span>
        <span class="context-menu-icon">⌘V</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="clear">
        <span>Clear</span>
        <span class="context-menu-icon">⌘K</span>
      </div>
    `;
    document.body.appendChild(this.menu);

    this.menu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (item && !item.classList.contains('disabled')) {
        this.handleAction(item.dataset.action);
      }
    });

    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', () => this.hide());
  }

  show(x, y, terminal, terminalId) {
    this.currentTerminal = terminal;
    this.currentTerminalId = terminalId;

    const hasSelection = terminal.hasSelection();
    const copyItem = this.menu.querySelector('[data-action="copy"]');
    if (copyItem) {
      copyItem.classList.toggle('disabled', !hasSelection);
    }

    const menuWidth = 150;
    const menuHeight = 120;
    const adjustedX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : x;
    const adjustedY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : y;

    this.menu.style.left = `${adjustedX}px`;
    this.menu.style.top = `${adjustedY}px`;
    this.menu.classList.add('visible');
  }

  hide() {
    this.menu.classList.remove('visible');
  }

  handleAction(action) {
    if (!this.currentTerminal) return;

    switch (action) {
      case 'copy':
        if (this.currentTerminal.hasSelection()) {
          const selection = this.currentTerminal.getSelection();
          clipboard.writeText(selection);
          if (clipboardHistory) {
            clipboardHistory.add(selection);
          }
        }
        break;
      case 'paste':
        const text = clipboard.readText();
        if (text && this.currentTerminalId) {
          ipcRenderer.send('terminal-input', { terminalId: this.currentTerminalId, data: text });
        }
        break;
      case 'clear':
        this.currentTerminal.clear();
        break;
    }

    this.hide();
    this.currentTerminal.focus();
  }
}

let contextMenu = null;

// ========================================
// CLIPBOARD HISTORY
// ========================================

class ClipboardHistory {
  constructor(maxItems = 10) {
    this.items = [];
    this.maxItems = maxItems;
  }

  add(text) {
    if (!text || !text.trim()) return;

    // Remove duplicate if exists
    const existingIndex = this.items.indexOf(text);
    if (existingIndex !== -1) {
      this.items.splice(existingIndex, 1);
    }

    // Add to front
    this.items.unshift(text);

    // Trim to max
    if (this.items.length > this.maxItems) {
      this.items = this.items.slice(0, this.maxItems);
    }
  }

  getAll() {
    return [...this.items];
  }

  get(index) {
    return this.items[index];
  }

  get length() {
    return this.items.length;
  }
}

class ClipboardHistoryPopup {
  constructor(clipboardHistory, paneManager) {
    this.clipboardHistory = clipboardHistory;
    this.paneManager = paneManager;
    this.popup = null;
    this.selectedIndex = 0;
    this.isVisible = false;
    this.vKeyDown = false;
    this.holdTimer = null;
    this.holdDelay = 1000; // 1 second hold to show popup

    this.createPopup();
    this.setupKeyboardListeners();
  }

  createPopup() {
    this.popup = document.createElement('div');
    this.popup.className = 'clipboard-history-popup';
    this.popup.innerHTML = `
      <div class="clipboard-history-header">CLIPBOARD HISTORY</div>
      <div class="clipboard-history-hint">↑↓ Navigate • Enter/Release V to paste • Esc to cancel</div>
      <div class="clipboard-history-list"></div>
    `;
    document.body.appendChild(this.popup);
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      // Handle popup navigation when visible
      if (this.isVisible) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          this.selectPrevious();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          this.selectNext();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          this.confirmSelection();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.hide();
          return;
        }
        // Block all other keys while popup is visible
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Detect Ctrl+V press
      if ((e.key === 'v' || e.key === 'V') && (e.ctrlKey || e.metaKey)) {
        // Always prevent default to stop terminal from pasting
        e.preventDefault();
        e.stopPropagation();

        // Ignore key repeat events
        if (this.vKeyDown) {
          return;
        }

        this.vKeyDown = true;

        // Start hold timer
        this.holdTimer = setTimeout(() => {
          if (this.vKeyDown && this.clipboardHistory.length > 0) {
            this.show();
          }
        }, this.holdDelay);
      }
    }, true);

    document.addEventListener('keyup', (e) => {
      if (e.key === 'v' || e.key === 'V') {
        // Clear hold timer
        if (this.holdTimer) {
          clearTimeout(this.holdTimer);
          this.holdTimer = null;
        }

        if (this.isVisible) {
          // Release V while popup visible = confirm selection
          e.preventDefault();
          e.stopPropagation();
          this.confirmSelection();
        } else if (this.vKeyDown) {
          // Released before popup shown - do normal paste from system clipboard
          const text = clipboard.readText();
          if (text) {
            this.pasteText(text);
          }
        }

        this.vKeyDown = false;
      }
    }, true);
  }

  show() {
    if (this.clipboardHistory.length === 0) return;

    this.selectedIndex = 0;
    this.renderList();
    this.positionPopup();
    this.popup.classList.add('visible');
    this.isVisible = true;
  }

  hide() {
    this.popup.classList.remove('visible');
    this.isVisible = false;
    this.selectedIndex = 0;

    // Refocus terminal
    const focusedPane = this.paneManager.getFocusedPane();
    if (focusedPane) {
      focusedPane.terminal.focus();
    }
  }

  positionPopup() {
    const focusedPane = this.paneManager.getFocusedPane();
    if (!focusedPane) return;

    const terminal = focusedPane.terminal;
    const wrapper = focusedPane.element.querySelector('.terminal-wrapper');
    if (!wrapper) return;

    const buffer = terminal.buffer.active;
    const rect = wrapper.getBoundingClientRect();
    const cellWidth = rect.width / terminal.cols;
    const cellHeight = rect.height / terminal.rows;

    let x = rect.left + (buffer.cursorX * cellWidth);
    let y = rect.top + ((buffer.cursorY + 1) * cellHeight);

    // Adjust if popup would go off screen
    const popupWidth = 350;
    const popupHeight = Math.min(300, 80 + this.clipboardHistory.length * 32);

    if (x + popupWidth > window.innerWidth) {
      x = window.innerWidth - popupWidth - 10;
    }
    if (y + popupHeight > window.innerHeight) {
      y = window.innerHeight - popupHeight - 10;
    }
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    this.popup.style.left = `${x}px`;
    this.popup.style.top = `${y}px`;
  }

  renderList() {
    const list = this.popup.querySelector('.clipboard-history-list');
    const items = this.clipboardHistory.getAll();

    list.innerHTML = items.map((text, index) => {
      const truncated = text.length > 50 ? text.substring(0, 47) + '...' : text;
      const escaped = this.escapeHtml(truncated).replace(/\n/g, '↵');
      const isSelected = index === this.selectedIndex;
      return `<div class="clipboard-history-item ${isSelected ? 'selected' : ''}" data-index="${index}">
        <span class="clipboard-history-number">${index + 1}.</span>
        <span class="clipboard-history-text">${escaped}</span>
      </div>`;
    }).join('');

    // Add click handlers
    list.querySelectorAll('.clipboard-history-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedIndex = parseInt(item.dataset.index);
        this.confirmSelection();
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  selectNext() {
    if (this.selectedIndex < this.clipboardHistory.length - 1) {
      this.selectedIndex++;
      this.renderList();
      this.scrollToSelected();
    }
  }

  selectPrevious() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.renderList();
      this.scrollToSelected();
    }
  }

  scrollToSelected() {
    const list = this.popup.querySelector('.clipboard-history-list');
    const selected = list.querySelector('.clipboard-history-item.selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  confirmSelection() {
    const text = this.clipboardHistory.get(this.selectedIndex);
    if (text) {
      this.pasteText(text);
    }
    this.hide();
  }

  pasteText(text) {
    const focusedPane = this.paneManager.getFocusedPane();
    if (focusedPane) {
      ipcRenderer.send('terminal-input', {
        terminalId: focusedPane.terminalId,
        data: text
      });
    }
  }
}

let clipboardHistory = null;
let clipboardHistoryPopup = null;

// ========================================
// SHORTCUT MANAGER
// ========================================

class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.actions = new Map();
    this.recordingCallback = null;
    this.recordingAction = null;

    this.loadFromSettings();
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  loadFromSettings() {
    this.shortcuts.clear();
    for (const [action, shortcut] of Object.entries(currentSettings.shortcuts)) {
      this.shortcuts.set(action, shortcut);
    }
  }

  parseShortcut(shortcutStr) {
    const parts = shortcutStr.split('+');
    return {
      ctrl: parts.includes('Ctrl'),
      shift: parts.includes('Shift'),
      alt: parts.includes('Alt'),
      meta: parts.includes('Meta'),
      key: parts[parts.length - 1],
    };
  }

  serializeEvent(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    let key = e.key;
    if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';
    else if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowRight') key = 'Right';
    else if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      return null;
    }

    parts.push(key);
    return parts.join('+');
  }

  matchesShortcut(e, shortcutStr) {
    const shortcut = this.parseShortcut(shortcutStr);
    const ctrl = e.ctrlKey || e.metaKey;

    let key = e.key;
    if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';
    else if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowRight') key = 'Right';
    else if (key.length === 1) key = key.toUpperCase();

    return (
      shortcut.ctrl === ctrl &&
      shortcut.shift === e.shiftKey &&
      shortcut.alt === e.altKey &&
      shortcut.key.toUpperCase() === key.toUpperCase()
    );
  }

  registerAction(action, callback) {
    this.actions.set(action, callback);
  }

  handleKeyDown(e) {
    if (this.recordingCallback) {
      e.preventDefault();
      e.stopPropagation();

      const serialized = this.serializeEvent(e);
      if (serialized) {
        this.recordingCallback(serialized);
        this.recordingCallback = null;
        this.recordingAction = null;
      }
      return;
    }

    for (const [action, shortcutStr] of this.shortcuts) {
      if (this.matchesShortcut(e, shortcutStr)) {
        const callback = this.actions.get(action);
        if (callback) {
          e.preventDefault();
          e.stopPropagation();
          callback();
          return;
        }
      }
    }
  }

  startRecording(action, callback) {
    this.recordingAction = action;
    this.recordingCallback = callback;
  }

  stopRecording() {
    this.recordingCallback = null;
    this.recordingAction = null;
  }

  setShortcut(action, shortcutStr) {
    this.shortcuts.set(action, shortcutStr);
    currentSettings.shortcuts[action] = shortcutStr;
    saveSettings();
  }

  getShortcut(action) {
    return this.shortcuts.get(action) || '';
  }

  detectConflict(shortcutStr, excludeAction) {
    for (const [action, existing] of this.shortcuts) {
      if (action !== excludeAction && existing === shortcutStr) {
        return action;
      }
    }
    return null;
  }

  resetToDefaults() {
    for (const [action, shortcut] of Object.entries(defaultShortcuts)) {
      this.shortcuts.set(action, shortcut);
    }
    currentSettings.shortcuts = { ...defaultShortcuts };
    saveSettings();
  }
}

// ========================================
// KEY SOUND MANAGER
// ========================================

class KeySoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = currentSettings.typingSoundEnabled;
    this.volume = currentSettings.typingSoundVolume / 100;
    this.lastPlayTime = 0;
    this.minInterval = 25; // Minimum ms between sounds
    this.keyIndex = 0; // For cycling through sound variations
    this.noiseBuffer = null; // Pre-generated noise buffer
  }

  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.createNoiseBuffer();
    } catch (e) {
      console.log('Web Audio API not supported');
      this.enabled = false;
    }
  }

  // Create a buffer of white noise for realistic key sounds
  createNoiseBuffer() {
    const ctx = this.audioContext;
    const bufferSize = ctx.sampleRate * 0.1; // 100ms of noise
    this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    currentSettings.typingSoundEnabled = enabled;
    saveSettings();
  }

  setVolume(volume) {
    this.volume = volume / 100;
    currentSettings.typingSoundVolume = volume;
    saveSettings();
  }

  // Realistic mechanical keyboard sound
  playKeySound() {
    if (!this.enabled || !this.audioContext) return;

    const now = Date.now();
    if (now - this.lastPlayTime < this.minInterval) return;
    this.lastPlayTime = now;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const t = ctx.currentTime;

    // Cycle through different key sounds for natural variation
    const soundType = this.keyIndex % 4;
    this.keyIndex++;

    if (soundType === 0) {
      this.playKeyClick(t, 1.0);
    } else if (soundType === 1) {
      this.playKeyClick(t, 0.9);
    } else if (soundType === 2) {
      this.playKeyThock(t);
    } else {
      this.playKeyClick(t, 1.05);
    }
  }

  // Realistic key click - the main keystroke sound
  playKeyClick(t, pitchVariation = 1) {
    const ctx = this.audioContext;

    // Create noise source for the initial impact
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    // Bandpass filter for the "click" character
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(1800 * pitchVariation + Math.random() * 200, t);
    clickFilter.Q.setValueAtTime(1.5, t);

    // Highpass to remove low rumble
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(400, t);

    // Envelope for the click
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0, t);
    clickGain.gain.linearRampToValueAtTime(this.volume * 0.25, t + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(this.volume * 0.08, t + 0.012);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    noiseSource.connect(clickFilter);
    clickFilter.connect(highpass);
    highpass.connect(clickGain);
    clickGain.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 0.04);

    // Add subtle low-frequency thump for body
    const thumpOsc = ctx.createOscillator();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(120 + Math.random() * 30, t);
    thumpOsc.frequency.exponentialRampToValueAtTime(60, t + 0.02);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0, t);
    thumpGain.gain.linearRampToValueAtTime(this.volume * 0.08, t + 0.001);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);

    thumpOsc.start(t);
    thumpOsc.stop(t + 0.03);
  }

  // Deeper "thock" sound - like a well-lubed switch bottoming out
  playKeyThock(t) {
    const ctx = this.audioContext;

    // Noise for the impact
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    // Lower bandpass for deeper thock
    const thockFilter = ctx.createBiquadFilter();
    thockFilter.type = 'bandpass';
    thockFilter.frequency.setValueAtTime(800 + Math.random() * 150, t);
    thockFilter.Q.setValueAtTime(1.2, t);

    const thockGain = ctx.createGain();
    thockGain.gain.setValueAtTime(0, t);
    thockGain.gain.linearRampToValueAtTime(this.volume * 0.22, t + 0.003);
    thockGain.gain.exponentialRampToValueAtTime(this.volume * 0.06, t + 0.015);
    thockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    noiseSource.connect(thockFilter);
    thockFilter.connect(thockGain);
    thockGain.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 0.05);

    // Deeper body thump
    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(90 + Math.random() * 20, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(45, t + 0.03);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0, t);
    bodyGain.gain.linearRampToValueAtTime(this.volume * 0.1, t + 0.002);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);

    bodyOsc.start(t);
    bodyOsc.stop(t + 0.04);
  }

  // Special key sound - deeper for Enter, Backspace, Delete (like space bar)
  playSpecialKeySound() {
    if (!this.enabled || !this.audioContext) return;

    const now = Date.now();
    if (now - this.lastPlayTime < this.minInterval) return;
    this.lastPlayTime = now;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const t = ctx.currentTime;

    // Noise for the impact - longer and deeper
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    // Lower frequency for bigger key feel
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600 + Math.random() * 100, t);
    filter.Q.setValueAtTime(0.8, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(this.volume * 0.28, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(this.volume * 0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 0.07);

    // Deeper body resonance
    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(70, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(35, t + 0.04);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0, t);
    bodyGain.gain.linearRampToValueAtTime(this.volume * 0.12, t + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);

    bodyOsc.start(t);
    bodyOsc.stop(t + 0.06);
  }
}

// ========================================
// SPEECH-TO-TEXT MANAGER
// ========================================

class SpeechToTextManager {
  constructor() {
    this.isRecording = false;
    this.isProcessing = false;
    this.isModelLoaded = false;
    this.mediaStream = null;
    this.audioContext = null;
    this.audioWorklet = null;
    this.recordedChunks = [];

    this.micBtn = null;
    this.statusEl = null;
    this.downloadBtn = null;
    this.downloadRow = null;
    this.progressRow = null;
    this.progressFill = null;
    this.progressText = null;

    // Listen for download progress
    ipcRenderer.on('stt-download-progress', (event, { progress }) => {
      this.updateDownloadProgress(progress);
    });
  }

  async init() {
    this.micBtn = document.getElementById('mic-btn');
    this.statusEl = document.getElementById('stt-model-status');
    this.downloadBtn = document.getElementById('stt-download-btn');
    this.downloadRow = document.getElementById('stt-download-row');
    this.progressRow = document.getElementById('stt-progress-row');
    this.progressFill = document.getElementById('stt-progress-fill');
    this.progressText = document.getElementById('stt-progress-text');

    if (!this.micBtn) return;

    // Set up button click handler
    this.micBtn.addEventListener('click', () => this.toggleRecording());

    // Set up download button
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.downloadModel());
    }

    // Check if model exists and load it
    await this.checkAndLoadModel();
  }

  async checkAndLoadModel() {
    try {
      const modelExists = await ipcRenderer.invoke('stt-check-model');

      if (modelExists) {
        this.updateStatus('LOADING...', 'loading');
        if (this.downloadRow) this.downloadRow.style.display = 'none';

        try {
          await ipcRenderer.invoke('stt-load-model');
          this.isModelLoaded = true;
          this.updateStatus('ONLINE', 'loaded');
          this.micBtn.disabled = false;
        } catch (err) {
          this.updateStatus('ERROR', 'error');
          console.error('Failed to load Whisper model:', err);
        }
      } else {
        this.updateStatus('OFFLINE', '');
        this.micBtn.disabled = true;
        if (this.downloadRow) this.downloadRow.style.display = 'flex';
      }
    } catch (err) {
      this.updateStatus('ERROR', 'error');
      console.error('Error checking model:', err);
    }
  }

  updateStatus(text, className) {
    if (this.statusEl) {
      this.statusEl.textContent = text;
      this.statusEl.className = 'stt-model-status';
      if (className) {
        this.statusEl.classList.add(className);
      }
    }
  }

  async downloadModel() {
    if (!this.downloadBtn) return;

    this.downloadBtn.disabled = true;
    this.downloadBtn.textContent = 'DOWNLOADING...';
    this.updateStatus('DOWNLOADING...', 'loading');

    if (this.downloadRow) this.downloadRow.style.display = 'none';
    if (this.progressRow) this.progressRow.style.display = 'flex';

    try {
      await ipcRenderer.invoke('stt-download-model');
      this.updateDownloadProgress(100);

      // Load the model after download
      this.updateStatus('LOADING...', 'loading');
      await ipcRenderer.invoke('stt-load-model');

      this.isModelLoaded = true;
      this.updateStatus('ONLINE', 'loaded');
      this.micBtn.disabled = false;

      if (this.progressRow) this.progressRow.style.display = 'none';
    } catch (err) {
      this.updateStatus('DOWNLOAD FAILED', 'error');
      this.downloadBtn.disabled = false;
      this.downloadBtn.textContent = 'RETRY DOWNLOAD';
      if (this.downloadRow) this.downloadRow.style.display = 'flex';
      if (this.progressRow) this.progressRow.style.display = 'none';
      console.error('Failed to download model:', err);
    }
  }

  updateDownloadProgress(progress) {
    if (this.progressFill) {
      this.progressFill.style.width = `${progress}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = `${progress}%`;
    }
  }

  async toggleRecording() {
    if (this.isProcessing) return;

    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    if (!this.isModelLoaded) {
      console.log('Model not loaded');
      return;
    }

    try {
      // Check microphone permission on macOS first
      console.log('Checking microphone permission...');
      const micStatus = await ipcRenderer.invoke('stt-check-mic-permission');
      console.log('Microphone permission status:', micStatus);

      if (micStatus === 'denied') {
        this.updateStatus('MIC DENIED', 'error');
        alert('Microphone access denied.\n\nPlease grant microphone permission:\n1. Open System Settings > Privacy & Security > Microphone\n2. Enable access for HackerTerm or Electron');
        return;
      }

      console.log('Requesting microphone access...');

      // Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      console.log('Microphone access granted, starting recording...');

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create a script processor to capture audio data
      const bufferSize = 4096;
      const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.recordedChunks = [];

      processor.onaudioprocess = (e) => {
        if (this.isRecording) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Copy the data since the buffer gets reused
          this.recordedChunks.push(new Float32Array(inputData));
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.processor = processor;
      this.source = source;

      this.isRecording = true;
      this.micBtn.classList.add('recording');
      this.micBtn.title = 'Click to stop recording';

    } catch (err) {
      console.error('Failed to start recording:', err);
      this.updateStatus('MIC ERROR', 'error');

      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
        alert('Microphone access denied.\n\nPlease grant microphone permission:\n1. Open System Preferences > Privacy & Security > Microphone\n2. Enable access for Electron or Terminal');
      } else {
        alert('Microphone error: ' + err.message);
      }
    }
  }

  async stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.micBtn.classList.remove('recording');
    this.micBtn.classList.add('processing');
    this.isProcessing = true;
    this.micBtn.title = 'Processing...';

    // Stop the media stream
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Combine all recorded chunks
    const totalLength = this.recordedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const audioData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.recordedChunks) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }
    this.recordedChunks = [];

    // Only transcribe if we have audio data
    if (audioData.length > 0) {
      try {
        const result = await ipcRenderer.invoke('stt-transcribe', Array.from(audioData));

        // Send transcribed text to focused terminal
        if (result && result.trim()) {
          this.sendToTerminal(result.trim());
        }
      } catch (err) {
        console.error('Transcription failed:', err);
      }
    }

    this.micBtn.classList.remove('processing');
    this.isProcessing = false;
    this.micBtn.title = 'Speech-to-Text (Ctrl+Shift+S)';
  }

  sendToTerminal(text) {
    const focusedPane = paneManager.getFocusedPane();
    if (focusedPane) {
      ipcRenderer.send('terminal-input', {
        terminalId: focusedPane.terminalId,
        data: text
      });
    }
  }
}

// ========================================
// PANE MANAGER
// ========================================

class PaneManager {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.panes = new Map();
    this.paneIdCounter = 0;
    this.focusedPaneId = null;

    ipcRenderer.on('terminal-data', (event, { terminalId, data }) => {
      for (const pane of this.panes.values()) {
        if (pane.terminalId === terminalId) {
          pane.terminal.write(data);
          break;
        }
      }
    });

    ipcRenderer.on('terminal-exit', (event, { terminalId, exitCode }) => {
      for (const [paneId, pane] of this.panes) {
        if (pane.terminalId === terminalId) {
          pane.terminal.write(`\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
          setTimeout(() => {
            if (this.getPaneCountForTab(pane.tabId) > 1) {
              this.closePane(paneId);
            }
          }, 1000);
          break;
        }
      }
    });
  }

  createTerminalOptions() {
    const themes = {
      matrix: {
        background: '#0a0a0a',
        foreground: '#00ff88',
        cursor: '#00ff88',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#00ff8855',
        black: '#0a0a0a',
        red: '#ff0044',
        green: '#00ff88',
        yellow: '#ffaa00',
        blue: '#00ccff',
        magenta: '#ff00aa',
        cyan: '#00ffcc',
        white: '#ccffcc',
        brightBlack: '#446655',
        brightRed: '#ff4477',
        brightGreen: '#44ffaa',
        brightYellow: '#ffcc44',
        brightBlue: '#44ddff',
        brightMagenta: '#ff44cc',
        brightCyan: '#44ffee',
        brightWhite: '#ffffff',
      },
      cyan: {
        background: '#0a0a0a',
        foreground: '#00ccff',
        cursor: '#00ccff',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#00ccff55',
        black: '#0a0a0a',
        red: '#ff0044',
        green: '#00ff88',
        yellow: '#ffaa00',
        blue: '#00ccff',
        magenta: '#ff00aa',
        cyan: '#00ffcc',
        white: '#ccffff',
        brightBlack: '#446666',
        brightRed: '#ff4477',
        brightGreen: '#44ffaa',
        brightYellow: '#ffcc44',
        brightBlue: '#44ddff',
        brightMagenta: '#ff44cc',
        brightCyan: '#44ffee',
        brightWhite: '#ffffff',
      },
      amber: {
        background: '#0a0a0a',
        foreground: '#ffaa00',
        cursor: '#ffaa00',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#ffaa0055',
        black: '#0a0a0a',
        red: '#ff5500',
        green: '#aaff00',
        yellow: '#ffaa00',
        blue: '#00aaff',
        magenta: '#ff5500',
        cyan: '#00ffaa',
        white: '#ffeecc',
        brightBlack: '#665544',
        brightRed: '#ff7744',
        brightGreen: '#ccff44',
        brightYellow: '#ffcc44',
        brightBlue: '#44ccff',
        brightMagenta: '#ff7744',
        brightCyan: '#44ffcc',
        brightWhite: '#ffffff',
      },
      red: {
        background: '#0a0a0a',
        foreground: '#ff0044',
        cursor: '#ff0044',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#ff004455',
        black: '#0a0a0a',
        red: '#ff0044',
        green: '#00ff44',
        yellow: '#ff4400',
        blue: '#0044ff',
        magenta: '#ff0088',
        cyan: '#00ffff',
        white: '#ffcccc',
        brightBlack: '#664444',
        brightRed: '#ff4477',
        brightGreen: '#44ff77',
        brightYellow: '#ff7744',
        brightBlue: '#4477ff',
        brightMagenta: '#ff44aa',
        brightCyan: '#44ffff',
        brightWhite: '#ffffff',
      }
    };

    const theme = themes[currentSettings.theme] || themes.matrix;

    return {
      fontFamily: '"Share Tech Mono", "IBM Plex Mono", "Consolas", monospace',
      fontSize: currentSettings.fontSize,
      fontWeight: '500',
      lineHeight: 1.25,
      letterSpacing: 0.5,
      cursorStyle: 'block',
      cursorBlink: true,
      theme: theme,
      allowTransparency: true,
      scrollback: 5000,
      tabStopWidth: 4,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: false,
      altSendsMeta: true,
      wordSeparator: ' \t\n()[]{}\\\'",`|&;<>=$~!@#%^*+?:',
    };
  }

  async createPane(tabId, container, cwd = null) {
    const paneId = ++this.paneIdCounter;

    const terminal = new Terminal(this.createTerminalOptions());
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    const terminalId = await ipcRenderer.invoke('terminal-create', cwd);

    const paneElement = document.createElement('div');
    paneElement.className = 'pane';
    paneElement.dataset.paneId = paneId;

    const terminalWrapper = document.createElement('div');
    terminalWrapper.className = 'terminal-wrapper';
    paneElement.appendChild(terminalWrapper);

    container.appendChild(paneElement);
    terminal.open(terminalWrapper);

    // Custom key handler for word navigation and clipboard history
    terminal.attachCustomKeyEventHandler((e) => {
      const isMac = process.platform === 'darwin';
      // Intercept Ctrl+V/Cmd+V to let clipboard history popup handle it
      if (e.type === 'keydown' && (e.key === 'v' || e.key === 'V') && (e.ctrlKey || e.metaKey)) {
        return false; // Prevent xterm from handling paste, let document listener handle it
      }
      // Option+Left (macOS) or Ctrl+Left (others) -> word left
      if (e.type === 'keydown' && e.key === 'ArrowLeft' && ((isMac && e.altKey) || (!isMac && e.ctrlKey))) {
        ipcRenderer.send('terminal-input', { terminalId, data: '\x1bb' });
        return false;
      }
      // Option+Right (macOS) or Ctrl+Right (others) -> word right
      if (e.type === 'keydown' && e.key === 'ArrowRight' && ((isMac && e.altKey) || (!isMac && e.ctrlKey))) {
        ipcRenderer.send('terminal-input', { terminalId, data: '\x1bf' });
        return false;
      }
      // Option+Backspace (macOS) or Ctrl+Backspace (others) -> delete word
      if (e.type === 'keydown' && e.key === 'Backspace' && ((isMac && e.altKey) || (!isMac && e.ctrlKey))) {
        ipcRenderer.send('terminal-input', { terminalId, data: '\x17' });
        return false;
      }
      return true;
    });

    // Context menu handler
    terminalWrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent document listener from hiding the menu
      if (contextMenu) {
        contextMenu.show(e.clientX, e.clientY, terminal, terminalId);
      }
    });

    // Helper to detect if position is over a URL
    const getUrlAtPosition = (col, row) => {
      const buffer = terminal.buffer.active;
      const lineIndex = buffer.viewportY + row;
      const line = buffer.getLine(lineIndex);
      if (!line) return null;

      const lineText = line.translateToString();
      const urlRegex = /https?:\/\/[^\s<>"')\]}>]+/g;
      let match;
      while ((match = urlRegex.exec(lineText)) !== null) {
        const startCol = match.index;
        const endCol = match.index + match[0].length;
        if (col >= startCol && col < endCol) {
          return match[0];
        }
      }
      return null;
    };

    // Helper to get cell position from mouse event
    const getCellPosition = (e) => {
      const rect = terminalWrapper.getBoundingClientRect();
      const cellWidth = rect.width / terminal.cols;
      const cellHeight = rect.height / terminal.rows;
      const col = Math.floor((e.clientX - rect.left) / cellWidth);
      const row = Math.floor((e.clientY - rect.top) / cellHeight);
      return { col, row };
    };

    // Ctrl+click to open links
    terminalWrapper.addEventListener('click', (e) => {
      const isMac = process.platform === 'darwin';
      const modifierPressed = isMac ? e.metaKey : e.ctrlKey;
      if (!modifierPressed) return;

      const { col, row } = getCellPosition(e);
      const url = getUrlAtPosition(col, row);
      if (url) {
        e.preventDefault();
        e.stopPropagation();
        shell.openExternal(url);
      }
    });

    // Change cursor to pointer when hovering over links with Ctrl/Cmd held
    terminalWrapper.addEventListener('mousemove', (e) => {
      const isMac = process.platform === 'darwin';
      const modifierPressed = isMac ? e.metaKey : e.ctrlKey;

      if (!modifierPressed) {
        terminalWrapper.style.cursor = '';
        return;
      }

      const { col, row } = getCellPosition(e);
      const url = getUrlAtPosition(col, row);
      terminalWrapper.style.cursor = url ? 'pointer' : '';
    });

    // Reset cursor when modifier key is released
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        terminalWrapper.style.cursor = '';
      }
    });

    this.panes.set(paneId, {
      paneId,
      tabId,
      terminalId,
      terminal,
      fitAddon,
      element: paneElement,
    });

    terminal.onData((data) => {
      ipcRenderer.send('terminal-input', { terminalId, data });

      // Play typing sound
      if (keySoundManager) {
        // Check for special keys (enter, backspace, etc.)
        if (data === '\r' || data === '\x7f' || data === '\x1b') {
          keySoundManager.playSpecialKeySound();
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
          // Regular printable character
          keySoundManager.playKeySound();
        }
      }

      // Trigger waveform spike on input
      if (waveformRenderer) {
        waveformRenderer.triggerSpike(0.5);
      }
    });

    paneElement.addEventListener('click', () => {
      this.focusPane(paneId);
    });

    setTimeout(() => {
      fitAddon.fit();
      ipcRenderer.send('terminal-resize', {
        terminalId,
        cols: terminal.cols,
        rows: terminal.rows,
      });
    }, 50);

    this.focusPane(paneId);

    return paneId;
  }

  async splitPane(paneId, direction) {
    const pane = this.panes.get(paneId);
    if (!pane) return null;

    // Get cwd from the pane being split
    const currentCwd = await this.getPaneCwd(paneId);

    const parentElement = pane.element.parentElement;
    const isHorizontal = direction === 'vertical';

    const splitContainer = document.createElement('div');
    splitContainer.className = isHorizontal ? 'split-horizontal' : 'split-vertical';

    const divider = document.createElement('div');
    divider.className = `split-divider ${isHorizontal ? 'horizontal' : 'vertical'}`;
    this.setupDividerDrag(divider, splitContainer, isHorizontal);

    parentElement.insertBefore(splitContainer, pane.element);
    splitContainer.appendChild(pane.element);
    splitContainer.appendChild(divider);

    const newPaneId = await this.createPane(pane.tabId, splitContainer, currentCwd);

    this.refitAllPanesInTab(pane.tabId);

    return newPaneId;
  }

  setupDividerDrag(divider, container, isHorizontal) {
    let isDragging = false;
    let startPos = 0;
    let startSizes = [];

    divider.addEventListener('mousedown', (e) => {
      isDragging = true;
      divider.classList.add('dragging');
      startPos = isHorizontal ? e.clientX : e.clientY;

      const children = Array.from(container.children).filter(
        c => !c.classList.contains('split-divider')
      );
      startSizes = children.map(c =>
        isHorizontal ? c.offsetWidth : c.offsetHeight
      );

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const currentPos = isHorizontal ? e.clientX : e.clientY;
      const delta = currentPos - startPos;

      const children = Array.from(container.children).filter(
        c => !c.classList.contains('split-divider')
      );

      if (children.length >= 2) {
        const totalSize = startSizes[0] + startSizes[1];
        const newSize1 = Math.max(100, Math.min(totalSize - 100, startSizes[0] + delta));
        const newSize2 = totalSize - newSize1;

        children[0].style.flex = `0 0 ${newSize1}px`;
        children[1].style.flex = `0 0 ${newSize2}px`;

        this.panes.forEach(pane => {
          if (children[0].contains(pane.element) || children[1].contains(pane.element)) {
            pane.fitAddon.fit();
            ipcRenderer.send('terminal-resize', {
              terminalId: pane.terminalId,
              cols: pane.terminal.cols,
              rows: pane.terminal.rows,
            });
          }
        });
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      divider.classList.remove('dragging');

      const children = Array.from(container.children).filter(
        c => !c.classList.contains('split-divider')
      );
      children.forEach(c => {
        c.style.flex = '1';
      });

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  closePane(paneId) {
    const pane = this.panes.get(paneId);
    if (!pane) return;

    ipcRenderer.send('terminal-destroy', pane.terminalId);

    const parent = pane.element.parentElement;
    const grandparent = parent.parentElement;

    pane.element.remove();
    pane.terminal.dispose();
    this.panes.delete(paneId);

    if (parent.classList.contains('split-horizontal') || parent.classList.contains('split-vertical')) {
      const remaining = Array.from(parent.children).filter(
        c => !c.classList.contains('split-divider')
      );

      Array.from(parent.querySelectorAll('.split-divider')).forEach(d => d.remove());

      if (remaining.length === 1) {
        grandparent.insertBefore(remaining[0], parent);
        parent.remove();
      } else if (remaining.length === 0) {
        parent.remove();
      }
    }

    if (this.focusedPaneId === paneId) {
      const tabPanes = this.getPanesForTab(pane.tabId);
      if (tabPanes.length > 0) {
        this.focusPane(tabPanes[0].paneId);
      } else {
        this.focusedPaneId = null;
      }
    }

    this.refitAllPanesInTab(pane.tabId);
  }

  focusPane(paneId) {
    this.panes.forEach(p => {
      p.element.classList.remove('focused');
    });

    const pane = this.panes.get(paneId);
    if (pane) {
      pane.element.classList.add('focused');
      pane.terminal.focus();
      this.focusedPaneId = paneId;
    }
  }

  focusDirection(direction) {
    if (!this.focusedPaneId) return;

    const currentPane = this.panes.get(this.focusedPaneId);
    if (!currentPane) return;

    const tabPanes = this.getPanesForTab(currentPane.tabId);
    if (tabPanes.length <= 1) return;

    const panePositions = tabPanes.map(p => {
      const rect = p.element.getBoundingClientRect();
      return {
        paneId: p.paneId,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    });

    const current = panePositions.find(p => p.paneId === this.focusedPaneId);
    if (!current) return;

    let bestCandidate = null;
    let bestScore = Infinity;

    for (const p of panePositions) {
      if (p.paneId === this.focusedPaneId) continue;

      const dx = p.x - current.x;
      const dy = p.y - current.y;
      let isValidDirection = false;
      let distance = 0;

      switch (direction) {
        case 'up':
          isValidDirection = dy < -10;
          distance = Math.abs(dy) + Math.abs(dx) * 0.5;
          break;
        case 'down':
          isValidDirection = dy > 10;
          distance = Math.abs(dy) + Math.abs(dx) * 0.5;
          break;
        case 'left':
          isValidDirection = dx < -10;
          distance = Math.abs(dx) + Math.abs(dy) * 0.5;
          break;
        case 'right':
          isValidDirection = dx > 10;
          distance = Math.abs(dx) + Math.abs(dy) * 0.5;
          break;
      }

      if (isValidDirection && distance < bestScore) {
        bestScore = distance;
        bestCandidate = p.paneId;
      }
    }

    if (bestCandidate) {
      this.focusPane(bestCandidate);
    }
  }

  focusNextPane() {
    if (!this.focusedPaneId) return;

    const currentPane = this.panes.get(this.focusedPaneId);
    if (!currentPane) return;

    const tabPanes = this.getPanesForTab(currentPane.tabId);
    if (tabPanes.length <= 1) return;

    const currentIndex = tabPanes.findIndex(p => p.paneId === this.focusedPaneId);
    const nextIndex = (currentIndex + 1) % tabPanes.length;
    this.focusPane(tabPanes[nextIndex].paneId);
  }

  getPanesForTab(tabId) {
    return Array.from(this.panes.values()).filter(p => p.tabId === tabId);
  }

  getPaneCountForTab(tabId) {
    return this.getPanesForTab(tabId).length;
  }

  refitAllPanesInTab(tabId) {
    setTimeout(() => {
      this.getPanesForTab(tabId).forEach(pane => {
        pane.fitAddon.fit();
        ipcRenderer.send('terminal-resize', {
          terminalId: pane.terminalId,
          cols: pane.terminal.cols,
          rows: pane.terminal.rows,
        });
      });
    }, 50);
  }

  refitAllPanes() {
    this.panes.forEach(pane => {
      pane.fitAddon.fit();
      ipcRenderer.send('terminal-resize', {
        terminalId: pane.terminalId,
        cols: pane.terminal.cols,
        rows: pane.terminal.rows,
      });
    });
  }

  destroyAllPanesInTab(tabId) {
    const tabPanes = this.getPanesForTab(tabId);
    tabPanes.forEach(pane => {
      ipcRenderer.send('terminal-destroy', pane.terminalId);
      pane.terminal.dispose();
      pane.element.remove();
      this.panes.delete(pane.paneId);
    });
  }

  updateAllTerminalSettings() {
    const newOptions = this.createTerminalOptions();
    this.panes.forEach(pane => {
      pane.terminal.options.fontSize = newOptions.fontSize;
      pane.terminal.options.theme = newOptions.theme;
      pane.fitAddon.fit();
      ipcRenderer.send('terminal-resize', {
        terminalId: pane.terminalId,
        cols: pane.terminal.cols,
        rows: pane.terminal.rows,
      });
    });
  }

  getFocusedPane() {
    return this.panes.get(this.focusedPaneId);
  }

  async getPaneCwd(paneId) {
    const pane = this.panes.get(paneId);
    if (!pane) return null;
    return await ipcRenderer.invoke('terminal-get-cwd', pane.terminalId);
  }

  async getFocusedPaneCwd() {
    if (!this.focusedPaneId) return null;
    return await this.getPaneCwd(this.focusedPaneId);
  }
}

// ========================================
// TAB MANAGER
// ========================================

class TabManager {
  constructor(paneManager) {
    this.paneManager = paneManager;
    this.tabs = new Map();
    this.tabIdCounter = 0;
    this.activeTabId = null;

    this.tabsContainer = document.getElementById('tabs-container');
    this.paneContainer = document.getElementById('pane-container');
    this.newTabBtn = document.getElementById('new-tab-btn');

    this.newTabBtn.addEventListener('click', () => this.createTab());
  }

  async createTab() {
    // Get cwd from currently focused pane before creating new tab
    const currentCwd = await this.paneManager.getFocusedPaneCwd();

    const tabId = ++this.tabIdCounter;

    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tabId;
    tabElement.innerHTML = `
      <span class="tab-title">Terminal ${tabId}</span>
      <span class="tab-close">&times;</span>
    `;

    tabElement.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        this.switchTab(tabId);
      }
    });

    tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });

    this.tabsContainer.appendChild(tabElement);

    const contentElement = document.createElement('div');
    contentElement.className = 'tab-content';
    contentElement.dataset.tabId = tabId;
    this.paneContainer.appendChild(contentElement);

    this.tabs.set(tabId, {
      tabId,
      element: tabElement,
      contentElement,
    });

    await this.paneManager.createPane(tabId, contentElement, currentCwd);

    this.switchTab(tabId);

    return tabId;
  }

  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    if (this.tabs.size <= 1) {
      ipcRenderer.send('window-close');
      return;
    }

    this.paneManager.destroyAllPanesInTab(tabId);

    tab.element.remove();
    tab.contentElement.remove();
    this.tabs.delete(tabId);

    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.keys());
      if (remainingTabs.length > 0) {
        this.switchTab(remainingTabs[remainingTabs.length - 1]);
      }
    }
  }

  switchTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    this.tabs.forEach(t => {
      t.element.classList.remove('active');
      t.contentElement.classList.remove('active');
    });

    tab.element.classList.add('active');
    tab.contentElement.classList.add('active');
    this.activeTabId = tabId;

    const tabPanes = this.paneManager.getPanesForTab(tabId);
    if (tabPanes.length > 0) {
      this.paneManager.focusPane(tabPanes[0].paneId);
    }

    this.paneManager.refitAllPanesInTab(tabId);
  }

  nextTab() {
    const tabIds = Array.from(this.tabs.keys());
    if (tabIds.length <= 1) return;

    const currentIndex = tabIds.indexOf(this.activeTabId);
    const nextIndex = (currentIndex + 1) % tabIds.length;
    this.switchTab(tabIds[nextIndex]);
  }

  prevTab() {
    const tabIds = Array.from(this.tabs.keys());
    if (tabIds.length <= 1) return;

    const currentIndex = tabIds.indexOf(this.activeTabId);
    const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    this.switchTab(tabIds[prevIndex]);
  }

  getActiveTabId() {
    return this.activeTabId;
  }
}

// ========================================
// GLITCH MANAGER
// ========================================

class GlitchManager {
  constructor() {
    this.enabled = currentSettings.glitchEnabled !== false;
    this.intensity = currentSettings.glitchIntensity || 50;
    this.container = document.querySelector('.hacker-container');
    this.glitchOverlay = document.getElementById('glitch-overlay');
    this.staticCanvas = document.getElementById('static-canvas');
    this.staticCtx = this.staticCanvas ? this.staticCanvas.getContext('2d') : null;

    this.lastGlitchTime = Date.now();
    this.glitchInterval = this.calculateInterval();
    this.isGlitching = false;

    this.effects = ['screenTear', 'rgbSplit', 'staticBurst', 'flicker'];

    // Start the glitch loop
    this.scheduleNextGlitch();
  }

  calculateInterval() {
    // Base interval 5-15 seconds, modified by intensity
    const factor = 1 - (this.intensity / 100) * 0.7; // Higher intensity = more frequent
    return (5000 + Math.random() * 10000) * factor;
  }

  scheduleNextGlitch() {
    if (!this.enabled) return;

    setTimeout(() => {
      if (this.enabled && !this.isGlitching) {
        this.triggerRandomGlitch();
      }
      this.scheduleNextGlitch();
    }, this.glitchInterval);

    this.glitchInterval = this.calculateInterval();
  }

  triggerRandomGlitch() {
    if (!this.enabled || this.isGlitching) return;

    const effect = this.effects[Math.floor(Math.random() * this.effects.length)];
    const duration = 50 + Math.random() * 150; // 50-200ms

    this.isGlitching = true;

    switch (effect) {
      case 'screenTear':
        this.screenTear(duration);
        break;
      case 'rgbSplit':
        this.rgbSplit(duration);
        break;
      case 'staticBurst':
        this.staticBurst(duration);
        break;
      case 'flicker':
        this.flicker(duration);
        break;
    }

    setTimeout(() => {
      this.isGlitching = false;
    }, duration + 50);
  }

  screenTear(duration) {
    if (!this.container) return;

    // Create multiple tear slices
    const numTears = 2 + Math.floor(Math.random() * 3);
    const tears = [];

    for (let i = 0; i < numTears; i++) {
      const y = Math.random() * 100;
      const height = 2 + Math.random() * 8;
      const offset = (Math.random() - 0.5) * 20;
      tears.push({ y, height, offset });
    }

    // Apply using clip-path polygon
    const originalTransform = this.container.style.transform;

    // Create CSS for torn sections
    this.container.classList.add('glitch-tear');
    this.container.style.setProperty('--tear-offset', `${tears[0].offset}px`);

    setTimeout(() => {
      this.container.classList.remove('glitch-tear');
      this.container.style.transform = originalTransform;
    }, duration);
  }

  rgbSplit(duration) {
    if (!this.container) return;

    const offsetX = (Math.random() - 0.5) * 6;
    const offsetY = (Math.random() - 0.5) * 4;

    this.container.style.setProperty('--rgb-offset-x', `${offsetX}px`);
    this.container.style.setProperty('--rgb-offset-y', `${offsetY}px`);
    this.container.classList.add('glitch-rgb');

    setTimeout(() => {
      this.container.classList.remove('glitch-rgb');
    }, duration);
  }

  staticBurst(duration) {
    if (!this.staticCanvas || !this.staticCtx || !this.glitchOverlay) return;

    // Resize canvas to viewport
    this.staticCanvas.width = window.innerWidth;
    this.staticCanvas.height = window.innerHeight;

    const ctx = this.staticCtx;
    const width = this.staticCanvas.width;
    const height = this.staticCanvas.height;

    // Show overlay
    this.glitchOverlay.classList.add('active');

    // Generate static noise
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
      data[i + 3] = Math.random() * 100; // A (semi-transparent)
    }

    ctx.putImageData(imageData, 0, 0);

    // Animate noise
    let frame = 0;
    const maxFrames = Math.floor(duration / 16);

    const animateNoise = () => {
      if (frame >= maxFrames) {
        this.glitchOverlay.classList.remove('active');
        ctx.clearRect(0, 0, width, height);
        return;
      }

      // Regenerate some noise
      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < 0.3) {
          const value = Math.random() * 255;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      frame++;
      requestAnimationFrame(animateNoise);
    };

    animateNoise();
  }

  flicker(duration) {
    if (!this.container) return;

    const flickerCount = 3 + Math.floor(Math.random() * 5);
    const flickerInterval = duration / flickerCount;

    let count = 0;
    const doFlicker = () => {
      if (count >= flickerCount) {
        this.container.style.opacity = '1';
        return;
      }

      this.container.style.opacity = Math.random() < 0.5 ? '0.7' : '1';
      count++;
      setTimeout(doFlicker, flickerInterval);
    };

    doFlicker();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    currentSettings.glitchEnabled = enabled;
    saveSettings();

    if (!enabled) {
      // Clean up any active effects
      if (this.container) {
        this.container.classList.remove('glitch-tear', 'glitch-rgb');
        this.container.style.opacity = '1';
      }
      if (this.glitchOverlay) {
        this.glitchOverlay.classList.remove('active');
      }
    }
  }

  setIntensity(intensity) {
    this.intensity = intensity;
    currentSettings.glitchIntensity = intensity;
    saveSettings();
  }
}

// ========================================
// STATUS FOOTER
// ========================================

class StatusFooter {
  constructor() {
    this.cpuEl = document.getElementById('cpu-value');
    this.memEl = document.getElementById('mem-value');
    this.uptimeEl = document.getElementById('uptime-value');
    this.encryptEl = document.getElementById('encrypt-value');
    this.threatEl = document.getElementById('threat-value');
    this.nodeEl = document.getElementById('node-value');
    this.sessionEl = document.getElementById('session-value');

    // State
    this.startTime = Date.now();
    this.encryptionTypes = ['AES-256', 'RSA-4096', 'ECDSA', 'ChaCha20'];
    this.encryptIndex = 0;
    this.threatLevel = 'LOW';

    // For CPU calculation
    this.previousCpuInfo = null;

    // Generate session ID (static for the session)
    this.sessionId = '0x' + this.generateHex(6).toUpperCase();
    if (this.sessionEl) {
      this.sessionEl.textContent = this.sessionId;
    }

    // Generate initial node ID
    this.updateNodeId();

    // Start update intervals
    this.metricsIntervalId = null;
    this.uptimeIntervalId = null;
    this.encryptIntervalId = null;
    this.threatIntervalId = null;
    this.nodeIntervalId = null;

    this.start();
  }

  generateHex(length) {
    let hex = '';
    for (let i = 0; i < length; i++) {
      hex += Math.floor(Math.random() * 16).toString(16);
    }
    return hex;
  }

  start() {
    // Update metrics every 15 seconds (real system metrics)
    this.updateMetrics();
    this.metricsIntervalId = setInterval(() => this.updateMetrics(), 15000);

    // Update uptime every second
    this.updateUptime();
    this.uptimeIntervalId = setInterval(() => this.updateUptime(), 1000);

    // Rotate encryption every 8-15 seconds
    this.scheduleEncryptionRotation();

    // Random threat spikes every 15-45 seconds
    this.scheduleThreatSpike();

    // Update node ID occasionally (every 30-60 seconds)
    this.nodeIntervalId = setInterval(() => {
      if (Math.random() < 0.3) {
        this.updateNodeId();
      }
    }, 30000 + Math.random() * 30000);
  }

  stop() {
    if (this.metricsIntervalId) clearInterval(this.metricsIntervalId);
    if (this.uptimeIntervalId) clearInterval(this.uptimeIntervalId);
    if (this.encryptIntervalId) clearTimeout(this.encryptIntervalId);
    if (this.threatIntervalId) clearTimeout(this.threatIntervalId);
    if (this.nodeIntervalId) clearInterval(this.nodeIntervalId);
  }

  updateMetrics() {
    if (!this.cpuEl || !this.memEl) return;

    // Real memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usedMemGB = (usedMem / (1024 * 1024 * 1024)).toFixed(1);
    this.memEl.textContent = usedMemGB;

    // Real CPU usage (calculated from cpu times)
    const cpus = os.cpus();
    const currentCpuInfo = cpus.reduce((acc, cpu) => {
      acc.idle += cpu.times.idle;
      acc.total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
      return acc;
    }, { idle: 0, total: 0 });

    if (this.previousCpuInfo) {
      const idleDiff = currentCpuInfo.idle - this.previousCpuInfo.idle;
      const totalDiff = currentCpuInfo.total - this.previousCpuInfo.total;
      const cpuUsage = totalDiff > 0 ? Math.round(100 - (idleDiff / totalDiff * 100)) : 0;
      this.cpuEl.textContent = cpuUsage;
    } else {
      // First call, show 0 until we have a delta
      this.cpuEl.textContent = '0';
    }

    this.previousCpuInfo = currentCpuInfo;
  }

  updateUptime() {
    if (!this.uptimeEl) return;

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');

    this.uptimeEl.textContent = `${hours}:${minutes}:${seconds}`;
  }

  scheduleEncryptionRotation() {
    const delay = 8000 + Math.random() * 7000; // 8-15 seconds

    this.encryptIntervalId = setTimeout(() => {
      this.rotateEncryption();
      this.scheduleEncryptionRotation();
    }, delay);
  }

  rotateEncryption() {
    if (!this.encryptEl) return;

    // Occasionally show KEY ROTATION flash
    if (Math.random() < 0.2) {
      this.encryptEl.textContent = 'KEY ROTATE';
      this.encryptEl.classList.add('rotating');

      setTimeout(() => {
        this.encryptIndex = (this.encryptIndex + 1) % this.encryptionTypes.length;
        this.encryptEl.textContent = this.encryptionTypes[this.encryptIndex];
        this.encryptEl.classList.remove('rotating');
      }, 500);
    } else {
      this.encryptIndex = (this.encryptIndex + 1) % this.encryptionTypes.length;
      this.encryptEl.textContent = this.encryptionTypes[this.encryptIndex];
    }
  }

  scheduleThreatSpike() {
    const delay = 15000 + Math.random() * 30000; // 15-45 seconds

    this.threatIntervalId = setTimeout(() => {
      this.triggerThreatSpike();
      this.scheduleThreatSpike();
    }, delay);
  }

  triggerThreatSpike() {
    if (!this.threatEl) return;

    // Determine spike level: 70% chance MEDIUM, 30% chance HIGH
    const isHigh = Math.random() < 0.3;
    const newLevel = isHigh ? 'HIGH' : 'MEDIUM';
    const duration = isHigh ? 3000 : 5000; // HIGH lasts shorter

    this.setThreatLevel(newLevel);

    // Return to LOW after duration
    setTimeout(() => {
      this.setThreatLevel('LOW');
    }, duration);
  }

  setThreatLevel(level) {
    if (!this.threatEl) return;

    this.threatLevel = level;
    this.threatEl.textContent = level;

    // Remove all threat classes
    this.threatEl.classList.remove('threat-low', 'threat-medium', 'threat-high');

    // Add appropriate class
    switch (level) {
      case 'LOW':
        this.threatEl.classList.add('threat-low');
        break;
      case 'MEDIUM':
        this.threatEl.classList.add('threat-medium');
        break;
      case 'HIGH':
        this.threatEl.classList.add('threat-high');
        break;
    }
  }

  updateNodeId() {
    if (!this.nodeEl) return;

    const nodeId = this.generateHex(4).toUpperCase();
    this.nodeEl.textContent = nodeId;
  }
}

// ========================================
// GLOBAL MANAGERS
// ========================================

let shortcutManager;
let paneManager;
let tabManager;
let globeRenderer;
let dataStreamManager;
let bootSequence;
let keySoundManager;
let glitchManager;
let waveformRenderer;
let statusFooter;
let cityMapRenderer;
let speechToTextManager;

// ========================================
// CLOCK UPDATE
// ========================================

function updateClock() {
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s}`;
  }
}

// ========================================
// THEME APPLICATION
// ========================================

function applyTheme(themeName) {
  document.body.className = document.body.className
    .replace(/theme-\w+/g, '')
    .trim();
  document.body.classList.add(`theme-${themeName}`);

  // Update CSS variables
  const themes = {
    matrix: { primary: '#00ff88', secondary: '#00ccff' },
    cyan: { primary: '#00ccff', secondary: '#00ff88' },
    amber: { primary: '#ffaa00', secondary: '#ff5500' },
    red: { primary: '#ff0044', secondary: '#ff5500' }
  };

  const theme = themes[themeName] || themes.matrix;
  document.documentElement.style.setProperty('--primary-color', theme.primary);
  document.documentElement.style.setProperty('--primary-glow', theme.primary);
  document.documentElement.style.setProperty('--secondary-color', theme.secondary);

  // Update globe colors if available
  if (globeRenderer) {
    globeRenderer.updateColors();
  }

  // Update waveform colors
  if (waveformRenderer) {
    waveformRenderer.updateColors();
  }

  // Update city map colors
  if (cityMapRenderer) {
    cityMapRenderer.updateColors();
  }
}

// ========================================
// EFFECTS CONTROL
// ========================================

function updateEffects(enabled, intensity) {
  const container = document.querySelector('.hacker-container');
  if (!container) return;

  if (!enabled) {
    container.classList.add('effects-disabled');
  } else {
    container.classList.remove('effects-disabled');

    const factor = intensity / 100;

    const scanlines = document.querySelector('.scanlines');
    const scanSweep = document.querySelector('.scan-sweep');
    const gridOverlay = document.querySelector('.grid-overlay');
    const vignette = document.querySelector('.vignette');

    if (scanlines) scanlines.style.opacity = 0.3 * factor;
    if (scanSweep) scanSweep.style.opacity = 0.1 * factor;
    if (gridOverlay) gridOverlay.style.opacity = factor;
    if (vignette) vignette.style.opacity = factor;
  }

  // Update globe effects
  if (globeRenderer) {
    globeRenderer.setEffectsEnabled(enabled);
  }

  // Update waveform
  if (waveformRenderer) {
    waveformRenderer.setEnabled(enabled);
  }

  // Update city map
  if (cityMapRenderer) {
    cityMapRenderer.setEnabled(enabled);
  }

  // Update glitch (follows its own toggle, but respect master effects toggle)
  if (glitchManager && !enabled) {
    glitchManager.setEnabled(false);
  }
}

// ========================================
// DATA PANEL TOGGLE
// ========================================

function toggleDataPanel(visible) {
  const dataPanel = document.getElementById('data-panel');
  if (dataPanel) {
    if (visible) {
      dataPanel.classList.remove('hidden');
    } else {
      dataPanel.classList.add('hidden');
    }
  }

  // Refit terminals after layout change
  setTimeout(() => {
    paneManager.refitAllPanes();
  }, 350);
}

// ========================================
// SETTINGS PANEL
// ========================================

function initSettingsPanel() {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');

  const themeSelect = document.getElementById('theme-select');
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeValue = document.getElementById('font-size-value');
  const typingSoundToggle = document.getElementById('typing-sound-toggle');
  const typingSoundVolume = document.getElementById('typing-sound-volume');
  const typingSoundValue = document.getElementById('typing-sound-value');
  const effectsToggle = document.getElementById('effects-toggle');
  const effectsIntensity = document.getElementById('effects-intensity');
  const effectsValue = document.getElementById('effects-value');
  const glitchToggle = document.getElementById('glitch-toggle');
  const glitchIntensitySlider = document.getElementById('glitch-intensity');
  const glitchValue = document.getElementById('glitch-value');
  const dataPanelToggle = document.getElementById('data-panel-toggle');

  // Toggle settings panel
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsPanel.classList.toggle('open');
    if (settingsPanel.classList.contains('open')) {
      syncSettingsUI();
    }
  });

  settingsClose.addEventListener('click', () => {
    settingsPanel.classList.remove('open');
    const focused = paneManager.getFocusedPane();
    if (focused) focused.terminal.focus();
  });

  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
      settingsPanel.classList.remove('open');
    }
  });

  settingsPanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Theme select
  themeSelect.addEventListener('change', () => {
    currentSettings.theme = themeSelect.value;
    saveSettings();
    applyTheme(themeSelect.value);
    paneManager.updateAllTerminalSettings();
  });

  // Font size
  fontSizeSlider.addEventListener('input', () => {
    const size = parseInt(fontSizeSlider.value);
    fontSizeValue.textContent = `${size}px`;
    currentSettings.fontSize = size;
    saveSettings();
    paneManager.updateAllTerminalSettings();
  });

  // Typing sound toggle
  typingSoundToggle.addEventListener('change', () => {
    if (keySoundManager) {
      keySoundManager.setEnabled(typingSoundToggle.checked);
    }
  });

  // Typing sound volume
  typingSoundVolume.addEventListener('input', () => {
    const volume = parseInt(typingSoundVolume.value);
    typingSoundValue.textContent = `${volume}%`;
    if (keySoundManager) {
      keySoundManager.setVolume(volume);
      // Play a test sound so user can hear the volume
      keySoundManager.playKeySound();
    }
  });

  // Effects toggle
  effectsToggle.addEventListener('change', () => {
    currentSettings.effectsEnabled = effectsToggle.checked;
    saveSettings();
    updateEffects(effectsToggle.checked, currentSettings.effectsIntensity);
  });

  // Effects intensity
  effectsIntensity.addEventListener('input', () => {
    const intensity = parseInt(effectsIntensity.value);
    effectsValue.textContent = `${intensity}%`;
    currentSettings.effectsIntensity = intensity;
    saveSettings();
    updateEffects(currentSettings.effectsEnabled, intensity);
  });

  // Glitch toggle
  glitchToggle.addEventListener('change', () => {
    if (glitchManager) {
      glitchManager.setEnabled(glitchToggle.checked);
    }
  });

  // Glitch intensity
  glitchIntensitySlider.addEventListener('input', () => {
    const intensity = parseInt(glitchIntensitySlider.value);
    glitchValue.textContent = `${intensity}%`;
    if (glitchManager) {
      glitchManager.setIntensity(intensity);
    }
  });

  // Data panel toggle
  dataPanelToggle.addEventListener('change', () => {
    currentSettings.dataPanelVisible = dataPanelToggle.checked;
    saveSettings();
    toggleDataPanel(dataPanelToggle.checked);
  });

  // Initialize shortcuts UI
  initShortcutsUI();
}

function initShortcutsUI() {
  const shortcutsList = document.getElementById('shortcuts-list');
  const resetBtn = document.getElementById('reset-shortcuts-btn');

  function renderShortcuts() {
    shortcutsList.innerHTML = '';

    for (const [action, label] of Object.entries(shortcutLabels)) {
      const row = document.createElement('div');
      row.className = 'shortcut-row';

      const labelEl = document.createElement('span');
      labelEl.className = 'shortcut-label';
      labelEl.textContent = label;

      const keyEl = document.createElement('span');
      keyEl.className = 'shortcut-key';
      keyEl.textContent = shortcutManager.getShortcut(action);
      keyEl.dataset.action = action;

      keyEl.addEventListener('click', () => {
        if (keyEl.classList.contains('recording')) {
          shortcutManager.stopRecording();
          keyEl.classList.remove('recording');
          keyEl.textContent = shortcutManager.getShortcut(action);
          return;
        }

        document.querySelectorAll('.shortcut-key.recording').forEach(el => {
          el.classList.remove('recording');
          el.textContent = shortcutManager.getShortcut(el.dataset.action);
        });

        keyEl.classList.add('recording');
        keyEl.textContent = 'Press keys...';

        shortcutManager.startRecording(action, (newShortcut) => {
          keyEl.classList.remove('recording');

          const conflict = shortcutManager.detectConflict(newShortcut, action);
          if (conflict) {
            keyEl.textContent = `${newShortcut} (conflict)`;
            setTimeout(() => {
              keyEl.textContent = shortcutManager.getShortcut(action);
            }, 2000);
            return;
          }

          shortcutManager.setShortcut(action, newShortcut);
          keyEl.textContent = newShortcut;
        });
      });

      row.appendChild(labelEl);
      row.appendChild(keyEl);
      shortcutsList.appendChild(row);
    }
  }

  renderShortcuts();

  resetBtn.addEventListener('click', () => {
    shortcutManager.resetToDefaults();
    renderShortcuts();
  });
}

function syncSettingsUI() {
  const themeSelect = document.getElementById('theme-select');
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeValue = document.getElementById('font-size-value');
  const typingSoundToggle = document.getElementById('typing-sound-toggle');
  const typingSoundVolume = document.getElementById('typing-sound-volume');
  const typingSoundValue = document.getElementById('typing-sound-value');
  const effectsToggle = document.getElementById('effects-toggle');
  const effectsIntensity = document.getElementById('effects-intensity');
  const effectsValue = document.getElementById('effects-value');
  const glitchToggle = document.getElementById('glitch-toggle');
  const glitchIntensitySlider = document.getElementById('glitch-intensity');
  const glitchValue = document.getElementById('glitch-value');
  const dataPanelToggle = document.getElementById('data-panel-toggle');

  themeSelect.value = currentSettings.theme;
  fontSizeSlider.value = currentSettings.fontSize;
  fontSizeValue.textContent = `${currentSettings.fontSize}px`;
  typingSoundToggle.checked = currentSettings.typingSoundEnabled;
  typingSoundVolume.value = currentSettings.typingSoundVolume;
  typingSoundValue.textContent = `${currentSettings.typingSoundVolume}%`;
  effectsToggle.checked = currentSettings.effectsEnabled;
  effectsIntensity.value = currentSettings.effectsIntensity;
  effectsValue.textContent = `${currentSettings.effectsIntensity}%`;
  glitchToggle.checked = currentSettings.glitchEnabled !== false;
  glitchIntensitySlider.value = currentSettings.glitchIntensity || 50;
  glitchValue.textContent = `${currentSettings.glitchIntensity || 50}%`;
  dataPanelToggle.checked = currentSettings.dataPanelVisible;

  initShortcutsUI();
}

// ========================================
// SATELLITE LIST UPDATE
// ========================================

function updateSatelliteDisplay() {
  if (globeRenderer && dataStreamManager) {
    const satellites = globeRenderer.getSatellites();
    dataStreamManager.updateSatelliteList(satellites);

    const satCountEl = document.getElementById('sat-count');
    if (satCountEl) {
      satCountEl.textContent = satellites.length;
    }
  }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  // Apply saved theme
  applyTheme(currentSettings.theme);

  // Apply effects
  updateEffects(currentSettings.effectsEnabled, currentSettings.effectsIntensity);

  // Initialize boot sequence
  bootSequence = new BootSequence({
    onComplete: async () => {
      // Initialize managers
      shortcutManager = new ShortcutManager();
      keySoundManager = new KeySoundManager();
      keySoundManager.init();
      contextMenu = new ContextMenu();
      clipboardHistory = new ClipboardHistory();
      paneManager = new PaneManager(null);
      tabManager = new TabManager(paneManager);
      paneManager.tabManager = tabManager;
      clipboardHistoryPopup = new ClipboardHistoryPopup(clipboardHistory, paneManager);

      // Create initial tab
      await tabManager.createTab();

      // Register shortcut actions
      shortcutManager.registerAction('window.new', () => ipcRenderer.send('window-new'));
      shortcutManager.registerAction('tab.new', () => tabManager.createTab());
      shortcutManager.registerAction('tab.close', () => tabManager.closeTab(tabManager.getActiveTabId()));
      shortcutManager.registerAction('tab.next', () => tabManager.nextTab());
      shortcutManager.registerAction('tab.prev', () => tabManager.prevTab());
      shortcutManager.registerAction('pane.splitVertical', () => {
        const focused = paneManager.getFocusedPane();
        if (focused) paneManager.splitPane(focused.paneId, 'vertical');
      });
      shortcutManager.registerAction('pane.splitHorizontal', () => {
        const focused = paneManager.getFocusedPane();
        if (focused) paneManager.splitPane(focused.paneId, 'horizontal');
      });
      shortcutManager.registerAction('pane.close', () => {
        const focused = paneManager.getFocusedPane();
        if (focused && paneManager.getPaneCountForTab(focused.tabId) > 1) {
          paneManager.closePane(focused.paneId);
        }
      });
      shortcutManager.registerAction('pane.focusNext', () => paneManager.focusNextPane());
      shortcutManager.registerAction('pane.focusUp', () => paneManager.focusDirection('up'));
      shortcutManager.registerAction('pane.focusDown', () => paneManager.focusDirection('down'));
      shortcutManager.registerAction('pane.focusLeft', () => paneManager.focusDirection('left'));
      shortcutManager.registerAction('pane.focusRight', () => paneManager.focusDirection('right'));
      shortcutManager.registerAction('dataPanel.toggle', () => {
        currentSettings.dataPanelVisible = !currentSettings.dataPanelVisible;
        saveSettings();
        toggleDataPanel(currentSettings.dataPanelVisible);
        const toggle = document.getElementById('data-panel-toggle');
        if (toggle) toggle.checked = currentSettings.dataPanelVisible;
      });
      shortcutManager.registerAction('settings.open', () => {
        const settingsPanel = document.getElementById('settings-panel');
        settingsPanel.classList.toggle('open');
        if (settingsPanel.classList.contains('open')) {
          syncSettingsUI();
        }
      });
      shortcutManager.registerAction('stt.toggle', () => {
        if (speechToTextManager) {
          speechToTextManager.toggleRecording();
        }
      });

      // Initialize speech-to-text
      speechToTextManager = new SpeechToTextManager();
      speechToTextManager.init();

      // Initialize globe
      globeRenderer = new GlobeRenderer('globe-canvas');
      globeRenderer.setEffectsEnabled(currentSettings.effectsEnabled);
      globeRenderer.start();

      // Initialize data stream
      dataStreamManager = new DataStreamManager();
      dataStreamManager.start();

      // Initialize waveform renderer
      waveformRenderer = new WaveformRenderer('waveform-canvas');
      waveformRenderer.start();

      // Initialize city map renderer
      cityMapRenderer = new CityMapRenderer('city-map-canvas');
      cityMapRenderer.onTargetAcquired(() => {
        // Trigger threat spike in footer
        if (statusFooter) {
          statusFooter.triggerThreatSpike();
        }
        // Flash tracking status is handled by CityMapRenderer
      });
      cityMapRenderer.start();

      // Initialize glitch manager
      glitchManager = new GlitchManager();

      // Initialize status footer
      statusFooter = new StatusFooter();

      // Update satellite display periodically
      setInterval(updateSatelliteDisplay, 2000);
      updateSatelliteDisplay();

      // Apply data panel visibility
      toggleDataPanel(currentSettings.dataPanelVisible);

      // Initialize settings panel
      initSettingsPanel();
    }
  });

  // Run boot sequence
  bootSequence.run();

  // Start clock
  updateClock();
  setInterval(updateClock, 1000);

  // Handle window resize
  window.addEventListener('resize', () => {
    if (paneManager) {
      paneManager.refitAllPanes();
    }
  });

  // Window controls
  document.getElementById('close-btn').addEventListener('click', () => {
    ipcRenderer.send('window-close');
  });

  document.getElementById('minimize-btn').addEventListener('click', () => {
    ipcRenderer.send('window-minimize');
  });

  document.getElementById('maximize-btn').addEventListener('click', () => {
    ipcRenderer.send('window-maximize');
  });

  // Allow skipping boot sequence
  document.getElementById('boot-screen').addEventListener('click', () => {
    if (bootSequence) {
      bootSequence.skip();
    }
  });
});

// ========================================
// PERFORMANCE OPTIMIZATION
// ========================================

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (globeRenderer) globeRenderer.stop();
    if (dataStreamManager) dataStreamManager.stop();
    if (waveformRenderer) waveformRenderer.stop();
    if (cityMapRenderer) cityMapRenderer.stop();
    if (statusFooter) statusFooter.stop();
  } else {
    if (globeRenderer) globeRenderer.start();
    if (dataStreamManager) dataStreamManager.start();
    if (waveformRenderer) waveformRenderer.start();
    if (cityMapRenderer) cityMapRenderer.start();
    if (statusFooter) statusFooter.start();
  }
});
