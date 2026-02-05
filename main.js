const { app, BrowserWindow, ipcMain, nativeImage, systemPreferences } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');
const pty = require('node-pty');

// Whisper model management
const MODELS_DIR = path.join(__dirname, 'models');
const MODEL_FILE = 'ggml-base.en.bin';
const MODEL_PATH = path.join(MODELS_DIR, MODEL_FILE);
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin';

let whisperInstance = null;
let WhisperModule = null;

// Set app name
app.setName('HackerTerm');

// Set dock icon on macOS
if (process.platform === 'darwin') {
  const iconPath = path.join(__dirname, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  if (!icon.isEmpty()) {
    app.dock.setIcon(icon);
  }
}

let mainWindow;
// Multi-PTY management: Map<terminalId, { pty, webContents }>
const ptyProcesses = new Map();
let terminalIdCounter = 0;

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0a0a0a',
    frame: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
}

// Create a new PTY process and return its ID
function createPtyProcess(initialCwd = null, webContents = null) {
  const homeDir = os.homedir();
  const terminalId = ++terminalIdCounter;
  const cwd = initialCwd || homeDir;

  const ptyProcess = pty.spawn('/bin/bash', ['--rcfile', path.join(homeDir, '.bashrc'), '-i'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      HOME: homeDir,
      BASH_ENV: path.join(homeDir, '.bashrc'),
    },
  });

  ptyProcess.onData((data) => {
    const entry = ptyProcesses.get(terminalId);
    if (entry && entry.webContents && !entry.webContents.isDestroyed()) {
      entry.webContents.send('terminal-data', { terminalId, data });
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    const entry = ptyProcesses.get(terminalId);
    if (entry && entry.webContents && !entry.webContents.isDestroyed()) {
      entry.webContents.send('terminal-exit', { terminalId, exitCode });
    }
    ptyProcesses.delete(terminalId);
  });

  ptyProcesses.set(terminalId, { pty: ptyProcess, webContents });
  return terminalId;
}

// Create new terminal (optionally with a specific cwd)
ipcMain.handle('terminal-create', (event, cwd = null) => {
  return createPtyProcess(cwd, event.sender);
});

// Get the current working directory of a terminal
ipcMain.handle('terminal-get-cwd', async (event, terminalId) => {
  const entry = ptyProcesses.get(terminalId);
  if (!entry) return null;

  try {
    // Get the pid of the pty process
    const pid = entry.pty.pid;
    // Use lsof to get the cwd of the shell process
    const { execSync } = require('child_process');
    const output = execSync(`lsof -p ${pid} -a -d cwd -Fn 2>/dev/null | grep ^n | cut -c2-`, { encoding: 'utf8' });
    const cwd = output.trim();
    return cwd || null;
  } catch (e) {
    return null;
  }
});

// Destroy terminal by ID
ipcMain.on('terminal-destroy', (event, terminalId) => {
  const entry = ptyProcesses.get(terminalId);
  if (entry) {
    entry.pty.kill();
    ptyProcesses.delete(terminalId);
  }
});

// Terminal input - now takes { terminalId, data }
ipcMain.on('terminal-input', (event, { terminalId, data }) => {
  const entry = ptyProcesses.get(terminalId);
  if (entry) {
    entry.pty.write(data);
  }
});

// Terminal resize - now takes { terminalId, cols, rows }
ipcMain.on('terminal-resize', (event, { terminalId, cols, rows }) => {
  const entry = ptyProcesses.get(terminalId);
  if (entry) {
    entry.pty.resize(cols, rows);
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-new', () => {
  createWindow();
});

// ========================================
// SPEECH-TO-TEXT IPC HANDLERS
// ========================================

// Check if model exists
ipcMain.handle('stt-check-model', () => {
  return fs.existsSync(MODEL_PATH);
});

// Get model path
ipcMain.handle('stt-get-model-path', () => {
  return MODEL_PATH;
});

// Download model with progress
ipcMain.handle('stt-download-model', async () => {
  // Ensure models directory exists
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const tempPath = MODEL_PATH + '.tmp';
    const file = fs.createWriteStream(tempPath);

    const downloadWithRedirect = (url) => {
      https.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          downloadWithRedirect(redirectUrl);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          file.write(chunk);

          if (mainWindow && !mainWindow.isDestroyed()) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            mainWindow.webContents.send('stt-download-progress', { progress, downloadedSize, totalSize });
          }
        });

        response.on('end', () => {
          file.end();
          // Rename temp file to final path
          fs.renameSync(tempPath, MODEL_PATH);
          resolve(true);
        });

        response.on('error', (err) => {
          file.destroy();
          fs.unlinkSync(tempPath);
          reject(err);
        });
      }).on('error', (err) => {
        file.destroy();
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        reject(err);
      });
    };

    downloadWithRedirect(MODEL_URL);
  });
});

// Load Whisper model
ipcMain.handle('stt-load-model', async () => {
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error('Model not found');
  }

  try {
    if (!WhisperModule) {
      WhisperModule = require('@napi-rs/whisper');
    }
    const modelBuffer = fs.readFileSync(MODEL_PATH);
    whisperInstance = new WhisperModule.Whisper(modelBuffer);
    return true;
  } catch (err) {
    throw new Error(`Failed to load model: ${err.message}`);
  }
});

// Transcribe audio
ipcMain.handle('stt-transcribe', async (event, audioData) => {
  if (!whisperInstance || !WhisperModule) {
    throw new Error('Model not loaded');
  }

  try {
    // audioData is an array of PCM samples at 16kHz
    const pcmData = new Float32Array(audioData);

    // Create params for transcription
    const params = new WhisperModule.WhisperFullParams(WhisperModule.WhisperSamplingStrategy.Greedy);
    params.language = 'en';
    params.printProgress = false;
    params.singleSegment = true;

    // whisper.full() is SYNCHRONOUS and returns the transcribed text directly
    const result = whisperInstance.full(params, pcmData);

    return (result || '').trim();
  } catch (err) {
    throw new Error(`Transcription failed: ${err.message}`);
  }
});

// Check if model is loaded
ipcMain.handle('stt-is-loaded', () => {
  return whisperInstance !== null;
});

// Check microphone permission (macOS)
ipcMain.handle('stt-check-mic-permission', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('microphone');

    if (status === 'not-determined') {
      // Request permission
      const granted = await systemPreferences.askForMediaAccess('microphone');
      return granted ? 'granted' : 'denied';
    }
    return status;
  }
  return 'granted'; // Non-macOS platforms
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Kill all PTY processes
  for (const entry of ptyProcesses.values()) {
    entry.pty.kill();
  }
  ptyProcesses.clear();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
