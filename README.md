# HackerTerm

A cinematic hacker-movie aesthetic terminal emulator built with Electron. Features a spinning globe, data streams, target tracking, and immersive visual effects.

![MIT License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Full Terminal Emulator** - Powered by xterm.js with complete bash shell support
- **Spinning Globe** - Ultra-detailed 3D globe with cities, rivers, mountains, shipping lanes, flight paths, and weather systems
- **Target Tracking Panel** - Top-down city map with a moving target blip that follows streets
- **Data Streams** - Scrolling matrix-style data panels with system metrics
- **Waveform Display** - Oscilloscope visualization that reacts to keyboard input
- **Satellite View** - Animated satellite imagery panel
- **Boot Sequence** - Cinematic startup animation
- **Realistic Keyboard Sounds** - Mechanical keyboard audio feedback
- **Multiple Tabs & Split Panes** - Organize your workflow with tabs and horizontal/vertical splits
- **Directory Inheritance** - New terminals open in the same directory as the parent
- **Customizable Themes** - Multiple color schemes (Matrix Green, Amber, Cyan, Purple, Red Alert)
- **Adjustable Settings** - Font size, terminal opacity, animation toggles, and more

## Screenshots

The interface features a data panel sidebar with:
- Global Network globe visualization
- Target Tracking city map
- System data streams
- Waveform oscilloscope
- Status footer with threat level indicator

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd hackerterm

# Install dependencies
npm install

# Run in development mode
npm start
```

### Build

```bash
# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win

# Build for Linux
npm run build:linux

# Build for all platforms
npm run build:all
```

Build outputs are placed in the `dist/` directory.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + T` | New tab |
| `Cmd/Ctrl + W` | Close tab |
| `Cmd/Ctrl + Shift + ]` | Next tab |
| `Cmd/Ctrl + Shift + [` | Previous tab |
| `Cmd/Ctrl + D` | Split pane vertically |
| `Cmd/Ctrl + Shift + D` | Split pane horizontally |
| `Cmd/Ctrl + W` | Close pane (if multiple) |
| `Cmd/Ctrl + Option + Arrow` | Navigate between panes |
| `Cmd/Ctrl + ,` | Open settings |
| `Cmd/Ctrl + B` | Toggle data panel |
| `Cmd/Ctrl + +` | Increase font size |
| `Cmd/Ctrl + -` | Decrease font size |

## Project Structure

```
hackerterm/
├── main.js              # Electron main process
├── renderer.js          # Renderer process & UI logic
├── index.html           # Main HTML structure
├── styles.css           # Styling & themes
├── icon.png             # App icon
├── modules/
│   ├── BootSequence.js      # Startup animation
│   ├── GlobeRenderer.js     # 3D globe visualization
│   ├── CityMapRenderer.js   # Target tracking map
│   ├── DataStreamManager.js # Data stream panels
│   └── WaveformRenderer.js  # Oscilloscope display
└── package.json
```

## Technologies

- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [xterm.js](https://xtermjs.org/) - Terminal emulator component
- [node-pty](https://github.com/microsoft/node-pty) - Pseudoterminal bindings
- Canvas 2D API - Custom visualizations

## License

MIT License - see [LICENSE](LICENSE) for details.
