import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { exec } from 'child_process';
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { INITIAL_AUDIT_DATA, analyzeInventorySchema } from "./src/data/mockInventory";
import { AuditRecord } from "./src/types";

let currentInventory: AuditRecord[] = [...INITIAL_AUDIT_DATA];

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// API Routes FIRST

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. Audit Inventory Data endpoint
app.get("/api/audit-inventory", (req, res) => {
  const analysis = analyzeInventorySchema(currentInventory);
  res.json({
    fileInfo: {
      path: "/home/tim/work/enigma-pipeline/storage/audit_inventory.json",
      sizeFormatted: "3.0M",
      sizeBytes: 3145728,
      permissions: "-rw-rw-r--",
      owner: "tim",
      group: "tim",
      lastModified: "Jul 29 22:31"
    },
    schemaAnalysis: analysis,
    recordsCount: currentInventory.length,
    sampleRecords: currentInventory.slice(0, 100)
  });
});

// 3. Upload or update custom inventory
app.post("/api/audit-inventory/upload", (req, res) => {
  try {
    const { data } = req.body;
    if (Array.isArray(data)) {
      currentInventory = data;
      res.json({ success: true, count: currentInventory.length });
    } else if (data && typeof data === 'object') {
      // If it's a wrapped object with items
      const items = data.items || data.records || data.inventory || [data];
      currentInventory = Array.isArray(items) ? items : [data];
      res.json({ success: true, count: currentInventory.length });
    } else {
      res.status(400).json({ error: "Invalid JSON structure. Expected array or object with records." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load audit inventory" });
  }
});

// 4. CLI Execution endpoint (Simulating bash execution for tim@dragon9)
app.post("/api/cli", (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    res.status(400).json({ error: "Missing command string" });
    return;
  }

  const cmd = command.trim();
  let output = "";
  let exitCode = 0;
  const actionHint = undefined;

  if (cmd === "ls -lh ~/work/enigma-pipeline/storage/audit_inventory.json" || cmd.startsWith("ls ")) {
    output = "-rw-rw-r-- 1 tim tim 3.0M Jul 29 22:31 /home/tim/work/enigma-pipeline/storage/audit_inventory.json";
  } else if (cmd.includes("grep -c \"path\"") || cmd.includes("grep -c 'path'")) {
    output = "0";
    res.json({
      output: "0",
      exitCode: 0,
      lines: [
        { id: "1", type: "output", text: "0" },
        {
          id: "2",
          type: "hint",
          text: "🔍 Diagnosis: 0 occurrences found for exact key search \"path\". In audit_inventory.json, paths are saved as \"file_path\" and \"storage_uri\".",
          actionHint: {
            label: "Try running: grep -c \"file_path\"",
            command: "grep -c \"file_path\" ~/work/enigma-pipeline/storage/audit_inventory.json"
          }
        }
      ]
    });
    return;
  } else if (cmd.includes("grep -c \"file_path\"") || cmd.includes("grep -c 'file_path'")) {
    output = `${currentInventory.length}`;
  } else if (cmd.includes("grep -c \"storage_uri\"") || cmd.includes("grep -c 'storage_uri'")) {
    output = `${currentInventory.length}`;
  } else if (cmd.startsWith("grep ")) {
    // Perform real match in inventory
    const pattern = cmd.split(" ")[1]?.replace(/['"]/g, "") || "";
    const matches = currentInventory.filter(r => JSON.stringify(r).toLowerCase().includes(pattern.toLowerCase()));
    if (cmd.includes("-c")) {
      output = `${matches.length}`;
    } else {
      output = matches.slice(0, 5).map(m => JSON.stringify(m)).join("\n");
      if (matches.length > 5) output += `\n... [showing 5 of ${matches.length} matches]`;
    }
  } else if (cmd.startsWith("wc ") || cmd.includes("wc -l")) {
    output = `${currentInventory.length * 18} /home/tim/work/enigma-pipeline/storage/audit_inventory.json`;
  } else if (cmd.startsWith("du ") || cmd.includes("du -sh")) {
    output = "3.0M\t/home/tim/work/enigma-pipeline/storage/audit_inventory.json";
  } else if (cmd.startsWith("head ") || cmd === "head ~/work/enigma-pipeline/storage/audit_inventory.json") {
    output = JSON.stringify(currentInventory.slice(0, 2), null, 2);
  } else if (cmd.startsWith("jq ")) {
    if (cmd.includes(".[].file_path") || cmd.includes(".file_path")) {
      output = currentInventory.slice(0, 5).map(r => `"${r.file_path}"`).join("\n") + `\n... (${currentInventory.length} total items)`;
    } else if (cmd.includes("keys")) {
      output = JSON.stringify(Object.keys(currentInventory[0] || {}), null, 2);
    } else {
      output = JSON.stringify(currentInventory.slice(0, 3), null, 2);
    }
  } else if (cmd === "schema-check") {
    const analysis = analyzeInventorySchema(currentInventory);
    output = `=== ENIGMA AUDIT INVENTORY SCHEMA CHECK ===\nTotal Records: ${analysis.totalRecords}\nFile Size: 3.0MB\nKeys Found:\n` +
      analysis.keyOccurrences.map(k => ` - ${k.key.padEnd(18)} (${k.type}): ${k.count} (${k.percentage}%)`).join("\n");
  } else if (cmd === "clear") {
    res.json({ output: "", exitCode: 0, lines: [] });
    return;
  } else if (cmd === "help") {
    output = `Enigma Pipeline Audit CLI v2.4
Supported commands:
  ls -lh <path>        - List file details
  grep -c "<string>"   - Count string matches in inventory
  grep "<string>"      - Search audit records
  jq '<query>'         - Run JQ json query
  head <file>          - Inspect first few JSON records
  wc -l <file>         - Count lines
  du -sh <file>        - Check disk size
  schema-check         - Run automatic key frequency scan
  clear                - Clear terminal screen`;
  } else {
    output = `bash: command not found: ${cmd}. Type 'help' for available CLI commands.`;
    exitCode = 127;
  }

  res.json({ output, exitCode, lines: [{ id: "1", type: exitCode === 0 ? "output" : "error", text: output }] });
});

// 5. Gemini AI Pipeline Analysis endpoint
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(500).json({
        error: "GEMINI_API_KEY is not configured in secrets. Please set GEMINI_API_KEY in Settings > Secrets."
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const schemaSummary = analyzeInventorySchema(currentInventory);
    const systemInstruction = `You are the Lead Data Infrastructure Engineer for Enigma Pipeline at dragon9 workstation.
You specialize in storage audit inventory inspection, JSON schema discovery, CLI debugging (grep, jq, bash), and pipeline storage anomaly detection.

Context on the active file:
- Path: /home/tim/work/enigma-pipeline/storage/audit_inventory.json
- Size: 3.0 MB
- Record Count: ${schemaSummary.totalRecords}
- Keys in JSON: ${schemaSummary.keyOccurrences.map(k => `${k.key} (${k.type})`).join(', ')}
- Explanation for why grep "path" returned 0: The file location field is named "file_path" or "storage_uri", so literal quote search "path" yields 0 matches.

Provide concise, technically precise, and actionable diagnostic guidance to the engineer (Tim). Write cleanly formatted markdown with code snippets where helpful.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${prompt || "Analyze the current audit inventory schema and explain why grep -c 'path' returned 0."}\n\nAdditional context: ${JSON.stringify(context || {})}`,
      config: {
        systemInstruction
      }
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze with Gemini AI" });
  }
});

// 6. Real Drive Scanner Backend API with FFmpeg / FFprobe Probe Simulation
app.post("/api/scan-drive", (req, res) => {
  const { folderPath } = req.body;
  const targetDir = folderPath || "/home/tim/Videos";
  const timestamp = Date.now();

  let scannedAssets = [];

  if (targetDir.toLowerCase().includes("b-roll") || targetDir.toLowerCase().includes("broll")) {
    scannedAssets = [
      {
        id: `scanned_${timestamp}_b1`,
        filePath: `${targetDir}/tokyo_rain_neon_drive_4k.mp4`,
        fileName: "tokyo_rain_neon_drive_4k.mp4",
        fileSize: "850.1 MB",
        duration: "00:03:10",
        resolution: "3840x2160",
        fps: 60,
        codec: "hevc",
        thumbnailUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80",
        motionEnergy: 0.88,
        audioMood: "cyberpunk",
        bpm: 124,
        sceneCutCount: 22,
        aiTag: "CYBERPUNK-NIGHT",
        directorVibe: "Mad Maxwell",
        inTime: "00:00:00",
        outTime: "00:03:10"
      },
      {
        id: `scanned_${timestamp}_b2`,
        filePath: `${targetDir}/misty_redwood_forest_walk_4k.mov`,
        fileName: "misty_redwood_forest_walk_4k.mov",
        fileSize: "1.1 GB",
        duration: "00:04:20",
        resolution: "3840x2160",
        fps: 24,
        codec: "prores",
        thumbnailUrl: "https://images.unsplash.com/photo-1511497584788-876761c144ee?auto=format&fit=crop&w=400&q=80",
        motionEnergy: 0.15,
        audioMood: "ambient",
        bpm: 72,
        sceneCutCount: 2,
        aiTag: "NATURE-ZEN",
        directorVibe: "Mist Flow",
        inTime: "00:00:00",
        outTime: "00:04:20"
      }
    ];
  } else if (targetDir.toLowerCase().includes("render") || targetDir.toLowerCase().includes("export")) {
    scannedAssets = [
      {
        id: `scanned_${timestamp}_r1`,
        filePath: `${targetDir}/enigma_ep01_final_4k_master.mp4`,
        fileName: "enigma_ep01_final_4k_master.mp4",
        fileSize: "3.2 GB",
        duration: "00:12:45",
        resolution: "3840x2160",
        fps: 60,
        codec: "hevc",
        thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80",
        motionEnergy: 0.74,
        audioMood: "cinematic",
        bpm: 128,
        sceneCutCount: 54,
        aiTag: "MASTER-RENDER",
        directorVibe: "The Nine",
        inTime: "00:00:00",
        outTime: "00:12:45"
      }
    ];
  } else {
    // Default Videos directory scan
    scannedAssets = [
      {
        id: `scanned_${timestamp}_1`,
        filePath: `${targetDir}/ocean_drone_4k_master.mp4`,
        fileName: "ocean_drone_4k_master.mp4",
        fileSize: "720.4 MB",
        duration: "00:02:15",
        resolution: "3840x2160",
        fps: 60,
        codec: "hevc",
        thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
        motionEnergy: 0.91,
        audioMood: "cinematic",
        bpm: 128,
        sceneCutCount: 18,
        aiTag: "DRONE-GOLD",
        directorVibe: "Mad Maxwell",
        inTime: "00:00:00",
        outTime: "00:02:15"
      },
      {
        id: `scanned_${timestamp}_2`,
        filePath: `${targetDir}/tim_sovereign_studio_interview.mov`,
        fileName: "tim_sovereign_studio_interview.mov",
        fileSize: "1.4 GB",
        duration: "00:05:00",
        resolution: "3840x2160",
        fps: 24,
        codec: "prores",
        thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80",
        motionEnergy: 0.32,
        audioMood: "chill",
        bpm: 90,
        sceneCutCount: 4,
        aiTag: "A-ROLL-INTERVIEW",
        directorVibe: "The Nine",
        inTime: "00:00:10",
        outTime: "00:04:50"
      },
      {
        id: `scanned_${timestamp}_3`,
        filePath: `${targetDir}/neon_arcade_strobe_broll.mp4`,
        fileName: "neon_arcade_strobe_broll.mp4",
        fileSize: "410.2 MB",
        duration: "00:01:30",
        resolution: "3840x2160",
        fps: 60,
        codec: "h264",
        thumbnailUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80",
        motionEnergy: 0.96,
        audioMood: "aggressive",
        bpm: 145,
        sceneCutCount: 32,
        aiTag: "CYBERPUNK-NIGHT",
        directorVibe: "Hype Timmy",
        inTime: "00:00:00",
        outTime: "00:01:30"
      }
    ];
  }

  const ffprobeOutput = `ffprobe version 6.1.1-1 Copyright (c) 2007-2024 the FFmpeg developers
[ffprobe @ 0x55d4920] Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '${targetDir}':
  Duration: 00:08:45.20, start: 0.000000, bitrate: 48210 kb/s
  Stream #0:0[0x1](und): Video: hevc (Main 10) (hvc1 / 0x31637668), yuv420p10le(tv, bt2020nc/bt2020/smpte2084), 3840x2160 [SAR 1:1 DAR 16:9], 46200 kb/s, 60 fps, 60 tbr, 60 tbn
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 320 kb/s`;

  res.json({
    success: true,
    scannedDirectory: targetDir,
    scanTimeMs: 280,
    assetsFoundCount: scannedAssets.length,
    ffprobeLog: ffprobeOutput,
    assets: scannedAssets
  });
});

// 7. Tide Synth Beat Sync Endpoint
app.post("/api/tide-synth/beat-grid", (req, res) => {
  const { bpm = 128, beatsPerCut = 8, totalDurationSec = 60 } = req.body;
  const secondsPerBeat = 60 / bpm;
  const cutIntervalSec = secondsPerBeat * beatsPerCut;

  const markers = [];
  let currentTime = 0;
  let barIndex = 1;

  while (currentTime < totalDurationSec) {
    markers.push({
      timeSec: Number(currentTime.toFixed(2)),
      bar: barIndex,
      isDownbeat: barIndex % 4 === 1
    });
    currentTime += cutIntervalSec;
    barIndex++;
  }

  res.json({
    bpm,
    beatsPerCut,
    secondsPerBeat: Number(secondsPerBeat.toFixed(4)),
    cutIntervalSec: Number(cutIntervalSec.toFixed(2)),
    markers
  });
});

// 8. Broadcast Stream Controller Endpoint
let liveStreamState = {
  isLive: false,
  streamTitle: "FLUID MOTION TV: Sovereign 4K Broadcast",
  channelName: "dragon9_live",
  obsWebSocketStatus: "connected",
  streamKey: "live_dragon9_4k_sovereign_key",
  viewerCount: 1420,
  bitrateKbps: 15400,
  fps: 60,
  resolution: "3840x2160",
  lowerThirdsText: "LIVE: DRAGON NINE 4K SOVEREIGN STORY FORGE",
  audioPeakLeft: 84,
  audioPeakRight: 88
};

app.get("/api/broadcast/status", (req, res) => {
  if (liveStreamState.isLive) {
    liveStreamState.viewerCount += Math.floor(Math.random() * 11) - 5;
    liveStreamState.audioPeakLeft = Math.floor(Math.random() * 25) + 70;
    liveStreamState.audioPeakRight = Math.floor(Math.random() * 25) + 70;
  }
  res.json(liveStreamState);
});

app.post("/api/broadcast/toggle", (req, res) => {
  liveStreamState.isLive = !liveStreamState.isLive;
  res.json({ success: true, isLive: liveStreamState.isLive, state: liveStreamState });
});

// 9. 4K Direct FFmpeg & Kdenlive MLT Render Pipeline with Real-Time Progress Stream
const RENDER_DIR = path.join(process.cwd(), 'renders');
try {
  if (!existsSync(RENDER_DIR)) mkdirSync(RENDER_DIR, { recursive: true });
} catch (e) {
  console.warn("Could not ensure render directory:", e);
}

// Active in-flight render jobs, SSE & WebSocket client registry
interface ServerRenderJob {
  jobId: string;
  projectName: string;
  director: string;
  status: 'rendering' | 'complete' | 'failed' | 'cancelled';
  percent: number;
  time: string;
  remainingTime: string;
  remainingSec: number;
  speed: string;
  fps: number;
  frame: number;
  totalFrames: number;
  size: string;
  outputPath: string;
  localOutputPath: string;
  mltPath: string;
  startedAt: string;
  elapsedMs: number;
  intervalTimer?: NodeJS.Timeout;
}

const activeJobs = new Map<string, ServerRenderJob>();
const sseClients = new Set<express.Response>();
const wsClients = new Set<WebSocket>();

function broadcastRenderEvent(eventData: any) {
  // 1. SSE Broadcast
  const ssePayload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(ssePayload);
    } catch (e) {
      sseClients.delete(client);
    }
  }

  // 2. WebSocket Broadcast
  const wsPayload = JSON.stringify(eventData);
  for (const ws of wsClients) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(wsPayload);
      }
    } catch (e) {
      wsClients.delete(ws);
    }
  }
}

function generateMltFromTimeline(timeline: any[], director: any) {
  const profile = `<?xml version="1.0" encoding="utf-8"?>
<mlt LC_NUMERIC="C" version="7.24.0" title="${director?.name || 'Dragon Nine'} Broadcast" producer="main">
  <profile description="4K UHD 24p" width="3840" height="2160" progressive="1" sample_aspect_num="1" sample_aspect_den="1" display_aspect_num="16" display_aspect_den="9" frame_rate_num="24" frame_rate_den="1" colorspace="2020"/>
  
  <producer id="black" in="0" out="1000">
    <property name="mlt_service">color</property>
    <property name="colour">0x00000000</property>
  </producer>
  
  ${timeline.map((seg, i) => {
    const filepath = seg.asset?.filePath || '/home/tim/Videos/ocean_drone_4k_master.mp4';
    const safePath = filepath.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const startFrame = Math.floor((seg.startTimeSec || 0) * 24);
    const durationFrames = Math.floor((seg.durationSec || 5) * 24);
    return `
  <producer id="producer_${i}" in="${startFrame}" out="${startFrame + durationFrames}">
    <property name="resource">${safePath}</property>
    <property name="mlt_service">avformat</property>
  </producer>`;
  }).join('')}
  
  <playlist id="main">
    ${timeline.map((seg, i) => {
      const startFrame = Math.floor((seg.startTimeSec || 0) * 24);
      const durationFrames = Math.floor((seg.durationSec || 5) * 24);
      return `
    <entry producer="producer_${i}" in="${startFrame}" out="${startFrame + durationFrames}"/>`;
    }).join('')}
  </playlist>
  
  <tractor id="tractor0" in="0" out="${timeline.reduce((a: number, s: any) => a + Math.floor((s.durationSec || 5) * 24), 0)}">
    <track producer="main"/>
    <transition id="transition0" out="${timeline.reduce((a: number, s: any) => a + Math.floor((s.durationSec || 5) * 24), 0)}">
      <property name="mlt_service">mix</property>
      <property name="a_track">0</property>
      <property name="b_track">1</property>
    </transition>
  </tractor>
</mlt>`;
  return profile;
}

function saveRenderMeta(jobId: string, meta: object) {
  try {
    const metaPath = path.join(RENDER_DIR, `${jobId}_meta.json`);
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch (e) {
    console.warn("Could not write render meta json:", e);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// SSE Progress Stream
app.get('/api/render/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send current active jobs immediately
  const currentJobs = Array.from(activeJobs.values()).map(j => ({
    jobId: j.jobId,
    projectName: j.projectName,
    director: j.director,
    status: j.status,
    percent: j.percent,
    time: j.time,
    remainingTime: j.remainingTime || '00:00:15',
    remainingSec: j.remainingSec || 15,
    speed: j.speed,
    fps: j.fps,
    frame: j.frame,
    totalFrames: j.totalFrames,
    size: j.size,
    outputPath: j.outputPath,
    mltPath: j.mltPath,
    startedAt: j.startedAt,
    elapsedMs: j.elapsedMs
  }));

  res.write(`data: ${JSON.stringify({ type: 'init', activeJobs: currentJobs })}\n\n`);

  // Heartbeat to keep connection fresh
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Get Active Render Jobs
app.get('/api/render/active', (req, res) => {
  const jobsList = Array.from(activeJobs.values()).map(j => ({
    jobId: j.jobId,
    projectName: j.projectName,
    director: j.director,
    status: j.status,
    percent: j.percent,
    time: j.time,
    remainingTime: j.remainingTime || '00:00:15',
    remainingSec: j.remainingSec || 15,
    speed: j.speed,
    fps: j.fps,
    frame: j.frame,
    totalFrames: j.totalFrames,
    size: j.size,
    outputPath: j.outputPath,
    mltPath: j.mltPath,
    startedAt: j.startedAt,
    elapsedMs: j.elapsedMs
  }));
  res.json({ activeJobs: jobsList });
});

// Cancel a Render Job
app.post('/api/render/cancel', (req, res) => {
  const { jobId } = req.body;
  if (!jobId || !activeJobs.has(jobId)) {
    res.status(404).json({ error: "Active job not found" });
    return;
  }
  const job = activeJobs.get(jobId)!;
  if (job.intervalTimer) clearInterval(job.intervalTimer);
  job.status = 'cancelled';
  broadcastRenderEvent({ type: 'cancelled', jobId, message: 'Render job cancelled by user.' });
  activeJobs.delete(jobId);
  res.json({ success: true, message: `Job ${jobId} cancelled.` });
});

app.post('/api/render/4k', (req, res) => {
  const { timeline = [], director, projectName = 'dragon9_broadcast' } = req.body;
  const jobId = `${projectName}_${Date.now()}`;
  
  try {
    const totalDurationSec = timeline.reduce((a: number, s: any) => a + (s.durationSec || 5), 0) || 60;
    const totalFrames = Math.max(240, Math.floor(totalDurationSec * 24));
    
    const mltXml = generateMltFromTimeline(timeline, director);
    const mltPath = path.join(RENDER_DIR, `${jobId}.mlt`);
    const outputPath = `/home/tim/work/enigma-pipeline/renders/${jobId}_4k_master.mp4`;
    const localOutputPath = path.join(RENDER_DIR, `${jobId}_4k_master.mp4`);

    try {
      writeFileSync(mltPath, mltXml);
    } catch (e) {
      console.warn("Could not write local render output file:", e);
    }

    const cmd = `ffmpeg -i "${mltPath}" -c:v libx264 -preset slow -crf 18 -s 3840x2160 -r 24 -pix_fmt yuv420p -c:a aac -b:a 320k -metadata title="Dragon Nine Broadcast" -y "${outputPath}"`;
    
    const startTime = Date.now();
    const newJob: ServerRenderJob = {
      jobId,
      projectName,
      director: director?.name || 'Dragon Nine',
      status: 'rendering',
      percent: 0,
      time: '00:00:00',
      remainingTime: '00:00:25',
      remainingSec: 25,
      speed: '1.8x',
      fps: 32,
      frame: 0,
      totalFrames,
      size: '1.2 MB',
      outputPath,
      localOutputPath,
      mltPath: `/home/tim/work/enigma-pipeline/renders/${jobId}.mlt`,
      startedAt: new Date().toISOString(),
      elapsedMs: 0
    };

    activeJobs.set(jobId, newJob);

    // Broadcast starting event
    broadcastRenderEvent({
      type: 'start',
      jobId,
      job: {
        jobId: newJob.jobId,
        projectName: newJob.projectName,
        director: newJob.director,
        status: newJob.status,
        percent: newJob.percent,
        time: newJob.time,
        remainingTime: newJob.remainingTime,
        remainingSec: newJob.remainingSec,
        speed: newJob.speed,
        fps: newJob.fps,
        frame: newJob.frame,
        totalFrames: newJob.totalFrames,
        size: newJob.size,
        outputPath: newJob.outputPath,
        mltPath: newJob.mltPath,
        startedAt: newJob.startedAt
      }
    });

    // Real-time render progress simulation ticker
    let currentPercent = 0;
    const progressInterval = setInterval(() => {
      const job = activeJobs.get(jobId);
      if (!job) {
        clearInterval(progressInterval);
        return;
      }

      currentPercent += Math.floor(Math.random() * 8) + 4; // increment 4-11% per tick
      const elapsedSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const ss = String(elapsedSec % 60).padStart(2, '0');
      const currentFrames = Math.min(totalFrames, Math.floor((currentPercent / 100) * totalFrames));
      const currentFps = Math.floor(Math.random() * 8) + 28; // 28-36 fps
      const currentSpeed = (1.6 + Math.random() * 0.6).toFixed(1) + 'x';
      const sizeMb = ((currentPercent / 100) * (totalDurationSec * 1.8)).toFixed(1) + ' MB';

      if (currentPercent >= 100) {
        clearInterval(progressInterval);
        job.percent = 100;
        job.status = 'complete';
        job.frame = totalFrames;
        job.time = `00:${mm}:${ss}`;
        job.remainingTime = '00:00:00';
        job.remainingSec = 0;
        job.size = `${(totalDurationSec * 1.8).toFixed(1)} MB`;
        job.elapsedMs = Date.now() - startTime;

        try {
          writeFileSync(localOutputPath, `SOVEREIGN_4K_MASTER_PAYLOAD_${jobId}`);
          saveRenderMeta(jobId, {
            director: job.director,
            projectName: job.projectName,
            segmentCount: timeline.length || 4,
            duration: totalDurationSec,
            renderProfile: '4K UHD 24p (3840x2160)',
            codec: 'libx264 (slow / CRF 18)',
            audioCodec: 'AAC 320kbps',
            completedAt: new Date().toISOString(),
            elapsedMs: job.elapsedMs,
            totalFrames
          });
        } catch (e) {
          console.warn("Could not write completed mock master:", e);
        }

        broadcastRenderEvent({
          type: 'complete',
          jobId,
          job: {
            ...job,
            intervalTimer: undefined
          },
          outputPath,
          elapsedMs: job.elapsedMs
        });

        setTimeout(() => {
          activeJobs.delete(jobId);
        }, 5000);
      } else {
        const remSecCalc = Math.max(1, Math.ceil(elapsedSec * (100 - currentPercent) / currentPercent));
        const remMin = String(Math.floor(remSecCalc / 60)).padStart(2, '0');
        const remSec = String(remSecCalc % 60).padStart(2, '0');
        const remainingTimeStr = `00:${remMin}:${remSec}`;

        job.percent = currentPercent;
        job.frame = currentFrames;
        job.fps = currentFps;
        job.speed = currentSpeed;
        job.size = sizeMb;
        job.time = `00:${mm}:${ss}`;
        job.remainingTime = remainingTimeStr;
        job.remainingSec = remSecCalc;
        job.elapsedMs = Date.now() - startTime;

        broadcastRenderEvent({
          type: 'progress',
          jobId,
          percent: job.percent,
          time: job.time,
          remainingTime: job.remainingTime,
          remainingSec: job.remainingSec,
          speed: job.speed,
          fps: job.fps,
          frame: job.frame,
          totalFrames: job.totalFrames,
          size: job.size,
          outputPath: job.outputPath
        });
      }
    }, 600);

    newJob.intervalTimer = progressInterval;

    res.json({
      success: true,
      jobId,
      mltPath: `/home/tim/work/enigma-pipeline/renders/${jobId}.mlt`,
      localMltPath: mltPath,
      outputPath,
      localOutputPath,
      message: '4K render pipeline started. Real-time telemetry streaming on SSE /api/render/events.',
      command: cmd,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

const sampleRenders = [
  {
    id: 'dragon9_master_20260803_192000',
    fileName: 'dragon9_master_20260803_192000_4k_master.mp4',
    outputPath: '/home/tim/work/enigma-pipeline/renders/dragon9_master_20260803_192000_4k_master.mp4',
    mltPath: '/home/tim/work/enigma-pipeline/renders/dragon9_master_20260803_192000.mlt',
    sizeBytes: 1420000000,
    sizeFormatted: '1.4 GB',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAtFormatted: new Date(Date.now() - 3600000 * 2).toLocaleString(),
    director: 'Mad Maxwell',
    projectName: 'Cyberpunk Tokyo Drone Cut',
    segmentCount: 8,
    duration: 145,
    status: 'complete'
  },
  {
    id: 'dragon9_zen_20260803_150000',
    fileName: 'dragon9_zen_20260803_150000_4k_master.mp4',
    outputPath: '/home/tim/work/enigma-pipeline/renders/dragon9_zen_20260803_150000_4k_master.mp4',
    mltPath: '/home/tim/work/enigma-pipeline/renders/dragon9_zen_20260803_150000.mlt',
    sizeBytes: 890000000,
    sizeFormatted: '890.0 MB',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    createdAtFormatted: new Date(Date.now() - 3600000 * 6).toLocaleString(),
    director: 'Mist Flow',
    projectName: 'Redwood Mist Ambient Loop',
    segmentCount: 4,
    duration: 260,
    status: 'complete'
  }
];

app.get('/api/render/history', (req, res) => {
  try {
    let filesOnDisk: any[] = [];
    if (existsSync(RENDER_DIR)) {
      filesOnDisk = readdirSync(RENDER_DIR)
        .filter(f => f.endsWith('_4k_master.mp4'))
        .map(f => {
          const fullPath = path.join(RENDER_DIR, f);
          const stats = statSync(fullPath);
          const jobId = f.replace('_4k_master.mp4', '');
          const mltPath = path.join(RENDER_DIR, `${jobId}.mlt`);
          const mltExists = existsSync(mltPath);
          
          const metaPath = path.join(RENDER_DIR, `${jobId}_meta.json`);
          let meta: any = {};
          if (existsSync(metaPath)) {
            try { meta = JSON.parse(readFileSync(metaPath, 'utf-8')); } catch {}
          }

          return {
            id: jobId,
            fileName: f,
            outputPath: `/home/tim/work/enigma-pipeline/renders/${f}`,
            mltPath: mltExists ? `/home/tim/work/enigma-pipeline/renders/${jobId}.mlt` : null,
            sizeBytes: stats.size,
            sizeFormatted: formatBytes(stats.size),
            createdAt: stats.birthtime,
            createdAtFormatted: new Date(stats.birthtime).toLocaleString(),
            director: meta.director || 'Dragon Nine',
            projectName: meta.projectName || jobId,
            segmentCount: meta.segmentCount || 5,
            duration: meta.duration || 120,
            status: 'complete'
          };
        });
    }

    const diskIds = new Set(filesOnDisk.map(f => f.id));
    const combined = [
      ...filesOnDisk,
      ...sampleRenders.filter(s => !diskIds.has(s.id))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalBytes = combined.reduce((acc, item) => acc + (item.sizeBytes || 0), 0);

    res.json({
      renders: combined,
      totalCount: combined.length,
      totalSize: formatBytes(totalBytes)
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Vite middleware & Static Serving & WebSocket Server

async function startServer() {
  const httpServer = http.createServer(app);

  // Initialize WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || `localhost:${PORT}`;
      const url = new URL(request.url || '', `http://${host}`);
      const p = url.pathname;
      if (p === '/ws/render' || p === '/api/render/ws' || p === '/ws' || p.startsWith('/ws/')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.warn("WebSocket upgrade error:", err);
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    wsClients.add(ws);

    // Immediately send current active jobs with progress and remaining time
    const currentJobs = Array.from(activeJobs.values()).map(j => ({
      jobId: j.jobId,
      projectName: j.projectName,
      director: j.director,
      status: j.status,
      percent: j.percent,
      time: j.time,
      remainingTime: j.remainingTime || '00:00:15',
      remainingSec: j.remainingSec || 15,
      speed: j.speed,
      fps: j.fps,
      frame: j.frame,
      totalFrames: j.totalFrames,
      size: j.size,
      outputPath: j.outputPath,
      mltPath: j.mltPath,
      startedAt: j.startedAt,
      elapsedMs: j.elapsedMs
    }));

    try {
      ws.send(JSON.stringify({
        type: 'init',
        activeJobs: currentJobs,
        serverTime: new Date().toISOString()
      }));
    } catch (e) {
      // client may have closed early
    }

    // Handle incoming client commands
    ws.on('message', (messageData) => {
      try {
        const payload = JSON.parse(messageData.toString());
        if (payload.action === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        } else if (payload.action === 'get_active') {
          const list = Array.from(activeJobs.values()).map(j => ({
            jobId: j.jobId,
            projectName: j.projectName,
            director: j.director,
            status: j.status,
            percent: j.percent,
            time: j.time,
            remainingTime: j.remainingTime,
            remainingSec: j.remainingSec,
            speed: j.speed,
            fps: j.fps,
            frame: j.frame,
            totalFrames: j.totalFrames,
            size: j.size,
            outputPath: j.outputPath,
            mltPath: j.mltPath,
            startedAt: j.startedAt,
            elapsedMs: j.elapsedMs
          }));
          ws.send(JSON.stringify({ type: 'active_jobs', activeJobs: list }));
        } else if (payload.action === 'cancel_job' && payload.jobId) {
          const job = activeJobs.get(payload.jobId);
          if (job) {
            if (job.intervalTimer) clearInterval(job.intervalTimer);
            job.status = 'cancelled';
            broadcastRenderEvent({ type: 'cancelled', jobId: payload.jobId, message: 'Cancelled by user via WebSocket.' });
            activeJobs.delete(payload.jobId);
          }
        }
      } catch (e) {
        console.warn("Invalid WebSocket message from client:", e);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
    });

    ws.on('error', () => {
      wsClients.delete(ws);
    });
  });

  // Regular WebSocket heartbeat ping to prevent connection drops across proxies
  const wsHeartbeatTimer = setInterval(() => {
    for (const ws of wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (e) {
          wsClients.delete(ws);
        }
      }
    }
  }, 20000);
  wsHeartbeatTimer.unref();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Enigma Pipeline Audit Server & WebSocket Telemetry running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown handling for clean dev server restarts
  const cleanup = () => {
    try {
      clearInterval(wsHeartbeatTimer);
      wss.close();
      httpServer.close(() => {
        process.exit(0);
      });
    } catch {
      process.exit(0);
    }
  };
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

startServer();
