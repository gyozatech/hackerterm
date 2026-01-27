const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const os = require('os');
const pty = require('node-pty');

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
// Multi-PTY management: Map<terminalId, ptyProcess>
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
function createPtyProcess(initialCwd = null) {
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-data', { terminalId, data });
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-exit', { terminalId, exitCode });
    }
    ptyProcesses.delete(terminalId);
  });

  ptyProcesses.set(terminalId, ptyProcess);
  return terminalId;
}

// Create new terminal (optionally with a specific cwd)
ipcMain.handle('terminal-create', (event, cwd = null) => {
  return createPtyProcess(cwd);
});

// Get the current working directory of a terminal
ipcMain.handle('terminal-get-cwd', async (event, terminalId) => {
  const ptyProcess = ptyProcesses.get(terminalId);
  if (!ptyProcess) return null;

  try {
    // Get the pid of the pty process
    const pid = ptyProcess.pid;
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
  const ptyProcess = ptyProcesses.get(terminalId);
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcesses.delete(terminalId);
  }
});

// Terminal input - now takes { terminalId, data }
ipcMain.on('terminal-input', (event, { terminalId, data }) => {
  const ptyProcess = ptyProcesses.get(terminalId);
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

// Terminal resize - now takes { terminalId, cols, rows }
ipcMain.on('terminal-resize', (event, { terminalId, cols, rows }) => {
  const ptyProcess = ptyProcesses.get(terminalId);
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Kill all PTY processes
  for (const ptyProcess of ptyProcesses.values()) {
    ptyProcess.kill();
  }
  ptyProcesses.clear();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
