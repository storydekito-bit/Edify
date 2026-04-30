export type AudioEditorSidebarSection =
  | 'import'
  | 'record'
  | 'sfx'
  | 'music'
  | 'voice-tools'
  | 'cleanup'
  | 'effects'
  | 'export';

export type AudioEditorExportFormat = 'mp3' | 'wav' | 'ogg' | 'aac';

export type AudioEditorQuality = 'Low' | 'Medium' | 'High' | 'Lossless';

export type AudioEditorSampleRate = '44.1kHz' | '48kHz';

export type AudioEditorBitrate = '128kbps' | '192kbps' | '320kbps';

export type AudioEditorAsset = {
  id: string;
  name: string;
  path: string;
  previewUrl: string;
  duration: number;
  waveform: number[];
  category: string;
  format: string;
  importedAt: string;
  kind: 'imported' | 'library' | 'recording';
};

export type AudioEditorClip = {
  id: string;
  assetId: string;
  name: string;
  trackId: string;
  start: number;
  duration: number;
  offset: number;
  color: string;
  volume: number;
  pan: number;
  fadeIn: number;
  fadeOut: number;
  pitch: number;
  speed: number;
  reversed: boolean;
  selected?: boolean;
};

export type AudioEditorTrack = {
  id: string;
  name: string;
  color: string;
  mute: boolean;
  solo: boolean;
  locked: boolean;
  volume: number;
  clips: AudioEditorClip[];
};

export type AudioEditorHistoryEntry = {
  id: string;
  label: string;
  createdAt: string;
};

export type AudioEditorEffect = {
  id: string;
  name: string;
  enabled: boolean;
  amount: number;
};

export type AudioEditorCleanupTool = {
  id: string;
  name: string;
  description: string;
  applied: boolean;
  processing: boolean;
};

export type AudioEditorAiTool = {
  id: string;
  name: string;
  description: string;
  processing: boolean;
  applied: boolean;
};

export type AudioEditorProject = {
  id: string;
  kind: 'audio-editor';
  version: 1;
  name: string;
  path?: string;
  createdAt: string;
  updatedAt: string;
  sampleRate: AudioEditorSampleRate;
  playbackRate: number;
  zoom: number;
  loop: boolean;
  duration: number;
  background: string;
  assets: AudioEditorAsset[];
  tracks: AudioEditorTrack[];
  selectedClipId?: string | null;
  selectedTrackId?: string | null;
  selectedRegion?: { start: number; end: number } | null;
  history: AudioEditorHistoryEntry[];
  effects: AudioEditorEffect[];
  eqBands: Record<string, number>;
  shortcutsVisible?: boolean;
};

export type AudioEditorProjectSummary = {
  id: string;
  name: string;
  path: string;
  updatedAt: string;
};

export type AudioEditorBootstrap = {
  recentProjects: AudioEditorProjectSummary[];
  accountUser?: {
    id: string;
    name: string;
    email: string;
    provider: 'google' | 'github' | 'microsoft';
  } | null;
};
