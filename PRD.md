# Spanda-DAQ - Product Requirements Document

## Product Vision
A browser-based LabVIEW-inspired IDE and DAQ integration platform built with Python and MATLAB backends, enabling VI (Virtual Instrument) design, DAQ hardware integration, signal processing, and real-time visualization.

## Sanskrit Name Meaning
**Spanda** = Pulse / Vibration / Divine Throb - perfectly captures DAQ signal acquisition

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Deployment**: Vercel (frontend) + Railway (backend)
- **Standalone**: Tauri (desktop packaging)
- **CI/CD**: GitHub Actions

## MVP Toolboxes (9 Total)

### P0 - Critical
| # | Toolbox | Description |
|---|---------|-------------|
| 1 | VI Designer | Drag-and-drop virtual instrument panel builder (knobs, gauges, indicators, graphs) |
| 2 | DAQ Toolbox | NI-DAQmx / USB DAQ / serial device integration via Python nidaqmx, pyserial, pyvisa |
| 3 | Signal Processing | FFT, filtering, windowing, waveform analysis via scipy / MATLAB engine |
| 4 | MATLAB Bridge | MATLAB Engine API integration, .m file execution, variable exchange |

### P1 - Important
| # | Toolbox | Description |
|---|---------|-------------|
| 5 | Data Logger | Real-time data capture, CSV/TDMS/HDF5 export, session management |
| 6 | Block Diagram Editor | Visual wiring/dataflow programming canvas (LabVIEW block diagram style) |
| 7 | Instrument Control | GPIB/USB/LAN instrument control via VISA, SCPI command library |

### P2 - Nice to Have
| # | Toolbox | Description |
|---|---------|-------------|
| 8 | Analysis Dashboard | Real-time charts, trend analysis, multi-channel plotting |
| 9 | Package Manager | Install/manage Python packages, MATLAB toolboxes, custom VI libraries |

## Architecture
```
Frontend (React + TypeScript + Tailwind)
     | REST / WebSocket
FastAPI Backend (Python)
     |-- nidaqmx / pyvisa / pyserial (DAQ layer)
     |-- MATLAB Engine API (MATLAB bridge - mocked for MVP)
     |-- scipy / numpy (signal processing)
     |-- WebSocket server (real-time data streaming)

Deployment:
  - Frontend -> Vercel
  - Backend -> Railway (Python FastAPI)
  - Standalone -> Tauri (desktop packaging)
```

## Srishti Workflow Phases
| Phase | Scope | Model | Effort |
|-------|-------|-------|--------|
| 1 | PRD + Repo setup + skeleton | Sonnet | Small |
| 2 | VI Designer + DAQ Toolbox | Opus | Large |
| 3 | Signal Processing + MATLAB Bridge | Opus | Large |
| 4 | Data Logger + Block Diagram Editor | Sonnet | Medium |
| 5 | Instrument Control + Dashboard | Sonnet | Medium |
| 6 | Package Manager + Integration tests | Sonnet | Medium |
| 7 | Vercel deploy + Tauri packaging | Sonnet | Small |

## Key Features per Toolbox

### 1. VI Designer
- Drag-and-drop controls: Knobs, Sliders, Buttons, Switches
- Indicators: Gauges, LEDs, Numeric displays, Thermometers
- Graph types: Waveform, XY, Chart, Intensity
- Panel layout with grid snapping
- Property editor for each control
- Save/Load VI configurations as JSON

### 2. DAQ Toolbox
- Device discovery and configuration
- Channel setup (AI, AO, DI, DO, CI)
- Sampling rate and trigger configuration
- Real-time acquisition preview
- Simulated DAQ for MVP (sine, square, noise generators)
- Task-based acquisition model

### 3. Signal Processing
- FFT / IFFT with configurable windows
- Digital filters (Butterworth, Chebyshev, FIR)
- Waveform generators (sine, square, sawtooth, noise)
- Time-domain and frequency-domain analysis
- Peak detection, RMS, THD calculations
- Interactive parameter adjustment

### 4. MATLAB Bridge
- Execute .m scripts from browser
- Variable workspace viewer
- Plot rendering from MATLAB output
- Code editor with MATLAB syntax highlighting
- Mocked engine for MVP (Python scipy equivalents)

### 5. Data Logger
- Multi-channel recording with timestamps
- Export formats: CSV, JSON, HDF5, TDMS
- Session management (start, stop, pause)
- Data preview table with sorting/filtering
- Auto-save and recovery

### 6. Block Diagram Editor
- Node-based visual programming
- Typed ports (numeric, boolean, array, waveform)
- Wire connections with type checking
- Built-in function nodes (math, logic, signal)
- Execution engine for dataflow
- Undo/redo support

### 7. Instrument Control
- VISA resource browser
- SCPI command terminal
- Instrument driver library
- Command history and favorites
- Response parsing and visualization

### 8. Analysis Dashboard
- Multi-channel real-time plots
- Trend analysis with moving averages
- Statistical summaries per channel
- Customizable layout (grid/tabs)
- Screenshot and report export

### 9. Package Manager
- Browse available packages
- Install/uninstall with dependency management
- Custom VI library upload
- Version tracking
- Environment configuration

## Non-Functional Requirements
- Responsive design (desktop-first)
- Dark/Light theme support
- WebSocket for real-time data (< 100ms latency)
- Offline capability for standalone version
- Keyboard shortcuts matching LabVIEW conventions

## Success Metrics
- All 9 toolboxes functional in browser
- Vercel deployment with working demo
- < 3s initial load time
- Real-time data streaming at 1kHz sample rate
- Standalone Tauri build under 100MB

---
*Srishti Workflow | ganeshgowri-ASA | March 2026*
