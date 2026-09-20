export interface AuditRecord {
  record_id: string;
  file_path: string; // The field is file_path, explaining why grep "path" returned 0!
  storage_uri: string;
  size_bytes: number;
  checksum_sha256: string;
  pipeline_stage: 'raw_ingest' | 'transformation' | 'feature_store' | 'archived' | 'staging';
  storage_class: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
  owner_service: 'enigma-ingest' | 'enigma-etl' | 'enigma-analytics' | 'enigma-export';
  created_at: string;
  last_modified: string;
  is_encrypted: boolean;
  retention_days: number;
  tags: string[];
  metadata: {
    format: 'parquet' | 'json' | 'csv' | 'avro' | 'orc';
    compression?: 'gzip' | 'snappy' | 'zstd' | 'none';
    record_count?: number;
    partition_key?: string;
  };
  health_status: 'healthy' | 'warning' | 'corrupt' | 'stale';
}

export interface MediaAsset {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: string;
  duration: string;
  resolution: string;
  fps: number;
  codec: string;
  thumbnailUrl: string;
  motionEnergy: number; // 0.0 - 1.0
  audioMood: 'aggressive' | 'ambient' | 'hype' | 'chill' | 'cinematic';
  bpm: number;
  sceneCutCount: number;
  aiTag: 'DRONE-GOLD' | 'A-ROLL-INTERVIEW' | 'B-ROLL-NATURE' | 'CHAOS-STREET' | '404-TRASH' | 'CYBERPUNK-NIGHT';
  directorVibe: 'Mad Maxwell' | 'Mist Flow' | 'The Nine' | 'Hype Timmy';
  inTime: string;
  outTime: string;
}

export interface DirectorPersona {
  id: 'chaos' | 'zen' | 'sovereign' | 'hype';
  name: string;
  title: string;
  voicePitch: number;
  voiceRate: number;
  voiceLang: string;
  tagline: string;
  editStyle: string;
  humor: string;
  color: string;
  avatarEmoji: string;
  roastCatchphrases: string[];
  hypeCatchphrases: string[];
}

export interface StorySegment {
  id: string;
  asset: MediaAsset;
  track: 'A-Roll (Main)' | 'B-Roll (Overlay)' | 'Voice/Avatar' | 'Audio/Synth';
  startTimeSec: number;
  durationSec: number;
  transition: 'glitch' | 'dissolve' | 'sovereign_wipe' | 'hard_cut';
  notes: string;
}

export interface TideSynthState {
  bpm: number;
  timeSignature: string;
  keySignature: string;
  synthWaveform: 'sine' | 'sawtooth' | 'square' | 'triangle';
  isBeatSyncActive: boolean;
  beatMultiplier: number; // 1, 2, 4, 8 beats per cut
}

export interface BroadcastStreamState {
  isLive: boolean;
  streamTitle: string;
  channelName: string;
  obsWebSocketStatus: 'connected' | 'connecting' | 'disconnected';
  streamKey: string;
  viewerCount: number;
  bitrateKbps: number;
  fps: number;
  resolution: string;
  lowerThirdsText: string;
  audioPeakLeft: number; // 0 - 100
  audioPeakRight: number; // 0 - 100
}

export interface ClipVoteState {
  assetId: string;
  vote: 'use' | 'transform' | 'archive';
  votedAt: string;
  roastReason?: string;
}

export interface KeyOccurrence {
  key: string;
  type: string;
  count: number;
  percentage: number;
  sampleValues: string[];
}

export interface SchemaAnalysis {
  totalRecords: number;
  totalSizeBytes: number;
  keyOccurrences: KeyOccurrence[];
  stagesBreakdown: Record<string, number>;
  storageClassBreakdown: Record<string, number>;
  healthBreakdown: Record<string, number>;
  suggestedKeys: {
    searched: string;
    matches: string[];
    explanation: string;
  };
}

export interface TerminalOutputLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system' | 'hint';
  text: string;
  timestamp?: string;
  actionHint?: {
    label: string;
    command: string;
  };
}

export interface CLICommandResult {
  output: string;
  exitCode: number;
  lines: TerminalOutputLine[];
}

export interface ActiveRenderJob {
  jobId: string;
  projectName: string;
  director: string;
  status: 'rendering' | 'complete' | 'failed' | 'cancelled';
  percent: number;
  time: string;
  remainingTime?: string;
  remainingSec?: number;
  speed: string;
  fps: number;
  frame: number;
  totalFrames: number;
  size: string;
  outputPath: string;
  mltPath: string;
  startedAt: string;
  elapsedMs?: number;
}

export interface RenderRecord {
  id: string;
  fileName: string;
  outputPath: string;
  mltPath: string | null;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  createdAtFormatted: string;
  director: string;
  projectName: string;
  segmentCount: number;
  duration: number | string;
  status: 'complete' | 'rendering' | 'failed' | 'cancelled';
}
