"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// Types
type ToolboxId = "vi" | "daq" | "signal" | "matlab" | "logger" | "blockdiag" | "instrument" | "dashboard" | "packages";
interface Channel { id: string; name: string; type: string; enabled: boolean; data: number[]; }
interface LogEntry { ts: number; ch: string; value: number; }
interface BlockNode { id: string; type: string; x: number; y: number; label: string; }
interface Wire { from: string; to: string; }

const TOOLBOXES: { id: ToolboxId; label: string; icon: string; desc: string }[] = [
  { id: "vi", label: "VI Designer", icon: "\u2699", desc: "Virtual Instrument Panel Builder" },
  { id: "daq", label: "DAQ Toolbox", icon: "\u26A1", desc: "Data Acquisition & Hardware" },
  { id: "signal", label: "Signal Processing", icon: "\u223F", desc: "FFT, Filters & Waveform Analysis" },
  { id: "matlab", label: "MATLAB Bridge", icon: "\u{1F4CA}", desc: "MATLAB Engine & Script Execution" },
  { id: "logger", label: "Data Logger", icon: "\u{1F4BE}", desc: "Multi-Channel Recording & Export" },
  { id: "blockdiag", label: "Block Diagram", icon: "\u{1F9E9}", desc: "Visual Dataflow Programming" },
  { id: "instrument", label: "Instrument Ctrl", icon: "\u{1F50C}", desc: "VISA / SCPI Instrument Control" },
  { id: "dashboard", label: "Dashboard", icon: "\u{1F4C8}", desc: "Real-Time Analysis & Charts" },
  { id: "packages", label: "Packages", icon: "\u{1F4E6}", desc: "Package & Library Manager" },
];

function genSine(f: number, sr: number, n: number, phase = 0, noise = 0) {
  return Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * f * i / sr + phase) + (Math.random() - 0.5) * noise);
}
function genSquare(f: number, sr: number, n: number) {
  return Array.from({ length: n }, (_, i) => Math.sign(Math.sin(2 * Math.PI * f * i / sr)));
}
function fft(signal: number[]): number[] {
  const n = signal.length;
  const mag: number[] = [];
  for (let k = 0; k < n / 2; k++) {
    let re = 0, im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      re += signal[t] * Math.cos(angle);
      im -= signal[t] * Math.sin(angle);
    }
    mag.push(Math.sqrt(re * re + im * im) / n);
  }
  return mag;
}
function butterworth(data: number[], cutoff: number, sr: number): number[] {
  const rc = 1.0 / (cutoff * 2 * Math.PI);
  const dt = 1.0 / sr;
  const alpha = dt / (rc + dt);
  const out = [data[0]];
  for (let i = 1; i < data.length; i++) out.push(out[i - 1] + alpha * (data[i] - out[i - 1]));
  return out;
}

// Simple SVG Chart
function MiniChart({ data, w = 400, h = 150, color = "#3b82f6", label = "" }: { data: number[]; w?: number; h?: number; color?: string; label?: string }) {
  if (!data.length) return <div className="text-slate-500 text-sm">No data</div>;
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / range) * h}`).join(" ");
  return (
    <div>
      {label && <div className="text-xs text-slate-400 mb-1">{label}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full border border-slate-700 rounded bg-slate-950" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    </div>
  );
}

// Gauge Component
function Gauge({ value, min = 0, max = 100, label = "", unit = "" }: { value: number; min?: number; max?: number; label?: string; unit?: string }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + pct * 270;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 120" className="w-28 h-28">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#334155" strokeWidth="8" strokeDasharray="235.6" strokeDashoffset="58.9" transform="rotate(135 60 60)" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="235.6" strokeDashoffset={235.6 - pct * 176.7} transform="rotate(135 60 60)" />
        <line x1="60" y1="60" x2="60" y2="20" stroke="#ef4444" strokeWidth="2" transform={`rotate(${angle} 60 60)`} />
        <circle cx="60" cy="60" r="4" fill="#ef4444" />
        <text x="60" y="85" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="bold">{value.toFixed(1)}</text>
        <text x="60" y="98" textAnchor="middle" fill="#94a3b8" fontSize="9">{unit}</text>
      </svg>
      {label && <span className="text-xs text-slate-400 mt-1">{label}</span>}
    </div>
  );
}

// LED Indicator
function LED({ on, color = "green", label = "" }: { on: boolean; color?: string; label?: string }) {
  const colors: Record<string, string> = { green: "#22c55e", red: "#ef4444", yellow: "#eab308", blue: "#3b82f6" };
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: on ? colors[color] || color : "#1e293b", boxShadow: on ? `0 0 8px ${colors[color] || color}` : "none" }} />
      {label && <span className="text-xs text-slate-300">{label}</span>}
    </div>
  );
}

// ===== TOOLBOX 1: VI Designer =====
function VIDesigner() {
  const [knob1, setKnob1] = useState(50);
  const [knob2, setKnob2] = useState(30);
  const [sw1, setSw1] = useState(false);
  const [sw2, setSw2] = useState(true);
  const waveData = genSine(knob1 / 10, 1000, 200, 0, knob2 / 100);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-400">Front Panel Designer</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-300">Controls</h4>
          <div><label className="text-xs text-slate-400">Frequency Knob</label><input type="range" min="1" max="100" value={knob1} onChange={e => setKnob1(+e.target.value)} className="w-full accent-blue-500" /><span className="text-xs text-blue-400">{knob1} Hz</span></div>
          <div><label className="text-xs text-slate-400">Noise Level</label><input type="range" min="0" max="100" value={knob2} onChange={e => setKnob2(+e.target.value)} className="w-full accent-green-500" /><span className="text-xs text-green-400">{knob2}%</span></div>
          <div className="flex gap-4">
            <button onClick={() => setSw1(!sw1)} className={`px-3 py-1 rounded text-xs font-bold ${sw1 ? "bg-green-600" : "bg-slate-600"}`}>{sw1 ? "RUN" : "STOP"}</button>
            <button onClick={() => setSw2(!sw2)} className={`px-3 py-1 rounded text-xs font-bold ${sw2 ? "bg-blue-600" : "bg-slate-600"}`}>{sw2 ? "CH ON" : "CH OFF"}</button>
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-300">Indicators</h4>
          <div className="flex gap-4">
            <Gauge value={knob1} max={100} label="Frequency" unit="Hz" />
            <Gauge value={knob2} max={100} label="Noise" unit="%" />
          </div>
          <div className="flex gap-3">
            <LED on={sw1} color="green" label="Running" />
            <LED on={sw2} color="blue" label="Channel" />
            <LED on={knob1 > 80} color="red" label="Overload" />
          </div>
        </div>
      </div>
      <MiniChart data={waveData} color="#3b82f6" label="Waveform Output" />
    </div>
  );
}

// ===== TOOLBOX 2: DAQ Toolbox =====
function DAQToolbox() {
  const [channels, setChannels] = useState<Channel[]>([
    { id: "ai0", name: "Voltage In", type: "AI", enabled: true, data: [] },
    { id: "ai1", name: "Current In", type: "AI", enabled: true, data: [] },
    { id: "ai2", name: "Temp Sensor", type: "AI", enabled: false, data: [] },
  ]);
  const [sampleRate, setSampleRate] = useState(1000);
  const [acquiring, setAcquiring] = useState(false);
  const [trigLevel, setTrigLevel] = useState(0.5);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (acquiring) {
      intervalRef.current = setInterval(() => {
        setChannels(prev => prev.map((ch, idx) => ({
          ...ch,
          data: ch.enabled ? [...ch.data.slice(-199), Math.sin(Date.now() / (300 + idx * 100)) + (Math.random() - 0.5) * 0.3] : ch.data,
        })));
      }, 1000 / Math.min(sampleRate, 60));
    } else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [acquiring, sampleRate]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-yellow-400">DAQ Configuration</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Device: Simulated DAQ</h4>
          <div className="text-xs text-slate-400 space-y-1">
            <div>Model: NI USB-6001 (Sim)</div>
            <div>Serial: SIM-00001</div>
            <div>Status: <span className="text-green-400">Connected</span></div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Acquisition</h4>
          <div><label className="text-xs text-slate-400">Sample Rate</label><input type="range" min="100" max="10000" step="100" value={sampleRate} onChange={e => setSampleRate(+e.target.value)} className="w-full accent-yellow-500" /><span className="text-xs text-yellow-400">{sampleRate} Hz</span></div>
          <div><label className="text-xs text-slate-400">Trigger Level</label><input type="range" min="0" max="1" step="0.01" value={trigLevel} onChange={e => setTrigLevel(+e.target.value)} className="w-full accent-orange-500" /><span className="text-xs text-orange-400">{trigLevel.toFixed(2)} V</span></div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Channels</h4>
          {channels.map(ch => (
            <div key={ch.id} className="flex items-center gap-2 text-xs mb-1">
              <input type="checkbox" checked={ch.enabled} onChange={() => setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, enabled: !c.enabled } : c))} className="accent-yellow-500" />
              <span className="text-slate-300">{ch.id}: {ch.name}</span>
              <span className="text-slate-500">({ch.type})</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setAcquiring(!acquiring)} className={`px-4 py-2 rounded font-bold text-sm ${acquiring ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>{acquiring ? "\u23F9 Stop" : "\u25B6 Start Acquisition"}</button>
        <button onClick={() => setChannels(prev => prev.map(c => ({ ...c, data: [] })))} className="px-4 py-2 rounded bg-slate-600 hover:bg-slate-500 text-sm">Clear</button>
      </div>
      {channels.filter(c => c.enabled).map(ch => (
        <MiniChart key={ch.id} data={ch.data} color={ch.id === "ai0" ? "#3b82f6" : ch.id === "ai1" ? "#22c55e" : "#eab308"} label={`${ch.name} (${ch.id})`} />
      ))}
    </div>
  );
}

// ===== TOOLBOX 3: Signal Processing =====
function SignalProcessing() {
  const [freq, setFreq] = useState(10);
  const [waveType, setWaveType] = useState("sine");
  const [cutoff, setCutoff] = useState(50);
  const [showFFT, setShowFFT] = useState(false);
  const sr = 512;
  const raw = waveType === "sine" ? genSine(freq, sr, sr, 0, 0.3) : genSquare(freq, sr, sr);
  const filtered = butterworth(raw, cutoff, sr);
  const spectrum = fft(raw);
  const rms = Math.sqrt(raw.reduce((s, v) => s + v * v, 0) / raw.length);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-purple-400">Signal Analysis</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Generator</h4>
          <select value={waveType} onChange={e => setWaveType(e.target.value)} className="w-full bg-slate-700 text-slate-200 text-xs rounded p-1 mb-2">
            <option value="sine">Sine Wave</option><option value="square">Square Wave</option>
          </select>
          <div><label className="text-xs text-slate-400">Frequency</label><input type="range" min="1" max="100" value={freq} onChange={e => setFreq(+e.target.value)} className="w-full accent-purple-500" /><span className="text-xs text-purple-400">{freq} Hz</span></div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Filter (Butterworth LP)</h4>
          <div><label className="text-xs text-slate-400">Cutoff</label><input type="range" min="1" max="200" value={cutoff} onChange={e => setCutoff(+e.target.value)} className="w-full accent-pink-500" /><span className="text-xs text-pink-400">{cutoff} Hz</span></div>
          <button onClick={() => setShowFFT(!showFFT)} className="mt-2 px-3 py-1 rounded bg-purple-700 hover:bg-purple-600 text-xs">{showFFT ? "Show Time" : "Show FFT"}</button>
        </div>
        <div className="bg-slate-800 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Stats</h4>
          <div className="text-xs text-slate-400 space-y-1"><div>RMS: <span className="text-white">{rms.toFixed(4)}</span></div><div>Peak: <span className="text-white">{Math.max(...raw).toFixed(4)}</span></div><div>Min: <span className="text-white">{Math.min(...raw).toFixed(4)}</span></div><div>Samples: <span className="text-white">{sr}</span></div></div>
        </div>
      </div>
      {showFFT ? <MiniChart data={spectrum.slice(0, 100)} color="#a855f7" label="FFT Magnitude Spectrum" /> : <><MiniChart data={raw.slice(0, 200)} color="#3b82f6" label="Raw Signal" /><MiniChart data={filtered.slice(0, 200)} color="#22c55e" label="Filtered Signal" /></>}
    </div>
  );
}

// ===== TOOLBOX 4: MATLAB Bridge =====
function MATLABBridge() {
  const [code, setCode] = useState("% MATLAB Script (Simulated)\nx = linspace(0, 2*pi, 100);\ny = sin(x) + 0.5*cos(3*x);\nplot(x, y);\ntitle('Spanda Signal');");
  const [output, setOutput] = useState("");
  const [vars, setVars] = useState<{name:string;type:string;size:string;value:string}[]>([]);
  const [running, setRunning] = useState(false);
  const runScript = () => {
    setRunning(true);
    setTimeout(() => {
      setOutput(">> Executing script...\n>> x = [0, 0.0635, 0.1269, ...]  (1x100 double)\n>> y = [0, 0.5585, 0.9389, ...]  (1x100 double)\n>> Plot generated successfully.\n>> Elapsed time: 0.034s");
      setVars([{name:"x",type:"double",size:"1x100",value:"[0, 0.0635, ...]"},{name:"y",type:"double",size:"1x100",value:"[0, 0.5585, ...]"},{name:"ans",type:"double",size:"1x1",value:"1"}]);
      setRunning(false);
    }, 1500);
  };
  const plotData = genSine(1, 100, 100, 0, 0).map((v, i) => v + 0.5 * Math.cos(3 * 2 * Math.PI * i / 100));
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-orange-400">MATLAB Engine (Mocked)</h3>
      <div className="grid grid-cols-2 gap-4">
        <div><textarea value={code} onChange={e => setCode(e.target.value)} className="w-full h-40 bg-slate-950 text-green-400 font-mono text-xs p-3 rounded border border-slate-700" />
          <button onClick={runScript} disabled={running} className="mt-2 px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-sm font-bold disabled:opacity-50">{running ? "Running..." : "\u25B6 Execute"}</button>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-950 rounded p-3 h-32 overflow-auto"><pre className="text-xs text-green-300 font-mono">{output || ">> Ready"}</pre></div>
          {vars.length > 0 && <div className="bg-slate-800 rounded p-3"><h4 className="text-xs font-bold text-slate-300 mb-2">Workspace</h4><table className="w-full text-xs"><thead><tr className="text-slate-500"><th className="text-left">Name</th><th>Type</th><th>Size</th></tr></thead><tbody>{vars.map(v => <tr key={v.name} className="text-slate-300"><td className="text-blue-400">{v.name}</td><td>{v.type}</td><td>{v.size}</td></tr>)}</tbody></table></div>}
        </div>
      </div>
      {output && <MiniChart data={plotData} color="#f97316" label="MATLAB Plot Output" />}
    </div>
  );
}

// ===== TOOLBOX 5: Data Logger =====
function DataLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [recording, setRecording] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => {
        setLogs(prev => [...prev.slice(-499), { ts: Date.now(), ch: ["ai0","ai1"][Math.floor(Math.random()*2)], value: Math.sin(Date.now()/500) + (Math.random()-0.5)*0.2 }]);
      }, 100);
    } else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [recording]);
  const exportCSV = () => {
    const csv = "Timestamp,Channel,Value\n" + logs.map(l => `${new Date(l.ts).toISOString()},${l.ch},${l.value.toFixed(6)}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "spanda_log.csv"; a.click();
  };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-teal-400">Data Logger</h3>
      <div className="flex gap-3">
        <button onClick={() => setRecording(!recording)} className={`px-4 py-2 rounded font-bold text-sm ${recording ? "bg-red-600" : "bg-green-600"}`}>{recording ? "\u23F9 Stop Recording" : "\u23FA Record"}</button>
        <button onClick={exportCSV} disabled={!logs.length} className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-600 text-sm disabled:opacity-50">Export CSV</button>
        <button onClick={() => setLogs([])} className="px-4 py-2 rounded bg-slate-600 text-sm">Clear</button>
        <span className="text-sm text-slate-400 self-center">{logs.length} entries</span>
      </div>
      <div className="bg-slate-800 rounded-lg p-3 h-48 overflow-auto"><table className="w-full text-xs"><thead><tr className="text-slate-500 border-b border-slate-700"><th className="text-left py-1">Time</th><th>Channel</th><th>Value</th></tr></thead><tbody>{logs.slice(-20).reverse().map((l, i) => <tr key={i} className="text-slate-300 border-b border-slate-800"><td className="py-0.5">{new Date(l.ts).toLocaleTimeString()}</td><td className="text-center text-blue-400">{l.ch}</td><td className="text-right text-green-400">{l.value.toFixed(4)}</td></tr>)}</tbody></table></div>
      <MiniChart data={logs.slice(-200).map(l => l.value)} color="#14b8a6" label="Recorded Data" />
    </div>
  );
}

// ===== TOOLBOX 6: Block Diagram Editor =====
function BlockDiagram() {
  const [nodes, setNodes] = useState<BlockNode[]>([
    { id: "n1", type: "input", x: 50, y: 80, label: "Signal In" },
    { id: "n2", type: "process", x: 250, y: 60, label: "FFT" },
    { id: "n3", type: "process", x: 250, y: 140, label: "Filter" },
    { id: "n4", type: "output", x: 450, y: 100, label: "Display" },
  ]);
  const [wires] = useState<Wire[]>([{ from: "n1", to: "n2" }, { from: "n1", to: "n3" }, { from: "n2", to: "n4" }, { from: "n3", to: "n4" }]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const nodeColors: Record<string, string> = { input: "#3b82f6", process: "#a855f7", output: "#22c55e" };
  const addNode = (type: string) => {
    const id = `n${nodes.length + 1}`;
    setNodes(prev => [...prev, { id, type, x: 150 + Math.random() * 200, y: 50 + Math.random() * 150, label: type === "input" ? "Input" : type === "process" ? "Process" : "Output" }]);
  };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-indigo-400">Block Diagram Editor</h3>
      <div className="flex gap-2">
        <button onClick={() => addNode("input")} className="px-3 py-1 rounded bg-blue-700 text-xs">+ Input</button>
        <button onClick={() => addNode("process")} className="px-3 py-1 rounded bg-purple-700 text-xs">+ Process</button>
        <button onClick={() => addNode("output")} className="px-3 py-1 rounded bg-green-700 text-xs">+ Output</button>
      </div>
      <svg className="w-full h-64 bg-slate-950 rounded border border-slate-700" viewBox="0 0 600 250">
        {wires.map((w, i) => { const fn = nodes.find(n => n.id === w.from); const tn = nodes.find(n => n.id === w.to); return fn && tn ? <line key={i} x1={fn.x + 50} y1={fn.y + 15} x2={tn.x} y2={tn.y + 15} stroke="#475569" strokeWidth="2" /> : null; })}
        {nodes.map(n => (
          <g key={n.id} onClick={() => setSelected(n.id)} style={{ cursor: "pointer" }}>
            <rect x={n.x} y={n.y} width="100" height="30" rx="4" fill={selected === n.id ? "#1e40af" : nodeColors[n.type]} stroke={selected === n.id ? "#60a5fa" : "transparent"} strokeWidth="2" />
            <text x={n.x + 50} y={n.y + 19} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{n.label}</text>
          </g>
        ))}
      </svg>
      {selected && <div className="bg-slate-800 rounded p-3 text-xs"><span className="text-slate-400">Selected:</span> <span className="text-white">{nodes.find(n => n.id === selected)?.label}</span> ({nodes.find(n => n.id === selected)?.type})</div>}
    </div>
  );
}

// ===== TOOLBOX 7: Instrument Control =====
function InstrumentControl() {
  const [cmd, setCmd] = useState("*IDN?");
  const [history, setHistory] = useState<{ cmd: string; resp: string }[]>([]);
  const [resource, setResource] = useState("GPIB0::1::INSTR");
  const scpiResponses: Record<string, string> = { "*IDN?": "Keysight,34465A,SIM001,1.0.0", "MEAS:VOLT:DC?": "+1.23456E+00", "MEAS:CURR:DC?": "+5.67890E-03", "SYST:ERR?": "+0,\"No error\"", "*RST": "OK" };
  const send = () => {
    const resp = scpiResponses[cmd.trim()] || `Error: Unknown command '${cmd}'`;
    setHistory(prev => [...prev, { cmd, resp }]);
    setCmd("");
  };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-rose-400">VISA Instrument Control</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-3 space-y-3">
          <div><label className="text-xs text-slate-400">VISA Resource</label><select value={resource} onChange={e => setResource(e.target.value)} className="w-full bg-slate-700 text-slate-200 text-xs rounded p-1"><option>GPIB0::1::INSTR</option><option>USB0::0x2A8D::INSTR</option><option>TCPIP0::192.168.1.100::INSTR</option></select></div>
          <div className="flex gap-2"><input value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} className="flex-1 bg-slate-950 text-green-400 font-mono text-xs p-2 rounded border border-slate-700" placeholder="SCPI Command..." /><button onClick={send} className="px-3 py-1 rounded bg-rose-700 hover:bg-rose-600 text-xs">Send</button></div>
          <div className="flex flex-wrap gap-1">{["*IDN?", "MEAS:VOLT:DC?", "MEAS:CURR:DC?", "*RST", "SYST:ERR?"].map(c => <button key={c} onClick={() => { setCmd(c); }} className="px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-300 hover:bg-slate-600">{c}</button>)}</div>
        </div>
        <div className="bg-slate-950 rounded-lg p-3 h-56 overflow-auto"><div className="font-mono text-xs space-y-1">{history.length ? history.map((h, i) => <div key={i}><span className="text-blue-400">&gt; {h.cmd}</span><br/><span className="text-green-300">{h.resp}</span></div>) : <span className="text-slate-500">No commands sent yet</span>}</div></div>
      </div>
    </div>
  );
}

// ===== TOOLBOX 8: Analysis Dashboard =====
function AnalysisDashboard() {
  const [data, setData] = useState<number[][]>([[], [], []]);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const t = Date.now();
        setData(prev => prev.map((ch, i) => [...ch.slice(-199), Math.sin(t / (400 + i * 150)) * (1 + i * 0.3) + (Math.random() - 0.5) * 0.2]));
      }, 50);
    } else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);
  const stats = data.map(ch => ({ mean: ch.length ? ch.reduce((a, b) => a + b, 0) / ch.length : 0, max: ch.length ? Math.max(...ch) : 0, min: ch.length ? Math.min(...ch) : 0 }));
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-cyan-400">Real-Time Dashboard</h3>
      <button onClick={() => setRunning(!running)} className={`px-4 py-2 rounded font-bold text-sm ${running ? "bg-red-600" : "bg-cyan-600"}`}>{running ? "\u23F9 Stop" : "\u25B6 Start Stream"}</button>
      <div className="grid grid-cols-3 gap-3">{["Channel A", "Channel B", "Channel C"].map((name, i) => <div key={i} className="bg-slate-800 rounded-lg p-3"><div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{name}</span><span className="text-slate-500">{data[i].length} pts</span></div><MiniChart data={data[i]} color={["#3b82f6", "#22c55e", "#eab308"][i]} /><div className="mt-2 text-xs text-slate-400 grid grid-cols-3 gap-1"><div>Mean: <span className="text-white">{stats[i].mean.toFixed(3)}</span></div><div>Max: <span className="text-green-400">{stats[i].max.toFixed(3)}</span></div><div>Min: <span className="text-red-400">{stats[i].min.toFixed(3)}</span></div></div></div>)}</div>
    </div>
  );
}

// ===== TOOLBOX 9: Package Manager =====
function PackageManager() {
  const [pkgs, setPkgs] = useState([
    { name: "numpy", version: "1.26.2", installed: true, desc: "Numerical computing" },
    { name: "scipy", version: "1.11.4", installed: true, desc: "Scientific computing" },
    { name: "nidaqmx", version: "0.9.0", installed: true, desc: "NI DAQ hardware interface" },
    { name: "pyvisa", version: "1.14.1", installed: false, desc: "VISA instrument control" },
    { name: "pyserial", version: "3.5", installed: false, desc: "Serial port access" },
    { name: "matplotlib", version: "3.8.2", installed: true, desc: "Plotting library" },
    { name: "h5py", version: "3.10.0", installed: false, desc: "HDF5 file format" },
  ]);
  const [search, setSearch] = useState("");
  const toggle = (name: string) => setPkgs(prev => prev.map(p => p.name === name ? { ...p, installed: !p.installed } : p));
  const filtered = pkgs.filter(p => p.name.includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-amber-400">Package Manager</h3>
      <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-800 text-slate-200 text-sm rounded p-2 border border-slate-700" placeholder="Search packages..." />
      <div className="grid gap-2">{filtered.map(p => (
        <div key={p.name} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
          <div><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-200">{p.name}</span><span className="text-xs text-slate-500">v{p.version}</span>{p.installed && <span className="text-xs bg-green-900 text-green-400 px-1.5 py-0.5 rounded">installed</span>}</div><div className="text-xs text-slate-400 mt-0.5">{p.desc}</div></div>
          <button onClick={() => toggle(p.name)} className={`px-3 py-1 rounded text-xs font-bold ${p.installed ? "bg-red-700 hover:bg-red-600" : "bg-green-700 hover:bg-green-600"}`}>{p.installed ? "Uninstall" : "Install"}</button>
        </div>
      ))}</div>
    </div>
  );
}

// ===== MAIN APP =====
export default function Home() {
  const [activeToolbox, setActiveToolbox] = useState<ToolboxId>("vi");
  const panels: Record<ToolboxId, JSX.Element> = {
    vi: <VIDesigner />, daq: <DAQToolbox />, signal: <SignalProcessing />,
    matlab: <MATLABBridge />, logger: <DataLogger />, blockdiag: <BlockDiagram />,
    instrument: <InstrumentControl />, dashboard: <AnalysisDashboard />, packages: <PackageManager />,
  };
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
                        <div className="text-2xl">{"\u{1F549}"}</div>
          <div><h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Spanda-DAQ</h1><p className="text-xs text-slate-400">LabVIEW-Inspired VI & DAQ Platform</p></div>
        </div>
        <div className="flex items-center gap-4">
          <LED on={true} color="green" label="System Online" />
          <span className="text-xs text-slate-500">v0.1.0-mvp</span>
        </div>
      </header>
      {/* Toolbox Nav */}
      <nav className="bg-slate-850 border-b border-slate-700 px-4 py-2 flex gap-1 overflow-x-auto">
        {TOOLBOXES.map(tb => (
          <button key={tb.id} onClick={() => setActiveToolbox(tb.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${activeToolbox === tb.id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
            <span>{tb.icon}</span>{tb.label}
          </button>
        ))}
      </nav>
      {/* Content */}
      <main className="p-6">{panels[activeToolbox]}</main>
      {/* Footer */}
      <footer className="border-t border-slate-700 px-6 py-2 flex justify-between text-xs text-slate-500">
        <span>Spanda-DAQ | Srishti Workflow | ganeshgowri-ASA</span>
        <span>9 Toolboxes | React + TypeScript + Tailwind</span>
      </footer>
    </div>
  );
}
