import fixWebmDuration from 'fix-webm-duration';
import type { BootstrapInfo, MediaAsset, ProjectDocument } from '../types/edify';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function replaceOutputExtension(filePath: string, extension: string) {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex <= 0) return `${filePath}.${extension}`;
  return `${filePath.slice(0, dotIndex)}.${extension}`;
}

function parseResolution(value?: string) {
  const match = value?.match(/(\d+)\s*x\s*(\d+)/i);
  return {
    width: match ? Number(match[1]) : 1920,
    height: match ? Number(match[2]) : 1080
  };
}

function parseMbps(value?: string) {
  const parsed = Number.parseFloat(String(value ?? '16 Mbps').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
}

function pickBrowserVideoMime() {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? '';
  return {
    mimeType,
    extension: 'webm'
  };
}

type BrowserExportRequest = {
  projectName: string;
  format?: string;
  resolution?: string;
  fps?: number;
  bitrate?: string;
  quality?: string;
  watermark?: boolean;
  project?: ProjectDocument;
};

type BrowserRenderResource = {
  kind: MediaAsset['kind'];
  media?: HTMLImageElement | HTMLVideoElement;
  objectUrl?: string;
};

function clipStart(clip: ProjectDocument['tracks'][number]['clips'][number]) {
  return Math.max(0, Number(clip.start) || 0);
}

function clipDuration(clip: ProjectDocument['tracks'][number]['clips'][number]) {
  return Math.max(0.05, Number(clip.duration) || 0.05);
}

function clipEnd(clip: ProjectDocument['tracks'][number]['clips'][number]) {
  return clipStart(clip) + clipDuration(clip);
}

function isClipVisibleAt(clip: ProjectDocument['tracks'][number]['clips'][number], time: number) {
  return time >= clipStart(clip) && time <= clipEnd(clip);
}

function loadBrowserImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (src.startsWith('http')) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image failed: ${src}`));
    image.src = src;
  });
}

function loadBrowserVideo(src: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    if (src.startsWith('http')) video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error(`Video failed: ${src}`));
    video.src = src;
  });
}

function isBrowserExportSafeSource(source: string) {
  if (source.startsWith('blob:') || source.startsWith('data:')) return true;
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    try {
      return new URL(source, location.href).origin === location.origin;
    } catch {
      return false;
    }
  }
  return false;
}

async function makeCanvasSafeSource(source: string) {
  if (source.startsWith('blob:') || source.startsWith('data:')) return { source };
  try {
    const url = new URL(source, location.href).href;
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    return { source: objectUrl, objectUrl };
  } catch {
    return null;
  }
}

async function prepareBrowserResources(project?: ProjectDocument) {
  const resources = new Map<string, BrowserRenderResource>();
  const assets = project?.assets ?? [];
  await Promise.all(
    assets.map(async (asset) => {
      const source = asset.previewUrl || asset.thumbnailUrl;
      if (!source) return;
      const safe = isBrowserExportSafeSource(source) ? { source } : await makeCanvasSafeSource(source);
      if (!safe) {
        resources.set(asset.id, { kind: asset.kind });
        return;
      }
      try {
        if (asset.kind === 'video' && asset.previewUrl) {
          resources.set(asset.id, { kind: asset.kind, media: await loadBrowserVideo(safe.source), objectUrl: safe.objectUrl });
          return;
        }
        if (asset.kind === 'image' || asset.thumbnailUrl || asset.previewUrl) {
          resources.set(asset.id, { kind: asset.kind, media: await loadBrowserImage(safe.source), objectUrl: safe.objectUrl });
        }
      } catch {
        resources.set(asset.id, { kind: asset.kind });
      }
    })
  );
  return resources;
}

function releaseBrowserResources(resources: Map<string, BrowserRenderResource>) {
  resources.forEach((resource) => {
    if (resource.objectUrl) URL.revokeObjectURL(resource.objectUrl);
  });
}

function drawCoverMedia(
  context: CanvasRenderingContext2D,
  media: CanvasImageSource,
  width: number,
  height: number,
  clip: ProjectDocument['tracks'][number]['clips'][number],
  naturalWidth: number,
  naturalHeight: number
) {
  const transform = clip.transform;
  const scale = Math.max(0.05, Number(transform.scale) || 1);
  const opacity = Math.max(0, Math.min(1, Number(transform.opacity ?? 1)));
  const drawScale = Math.max(width / Math.max(1, naturalWidth), height / Math.max(1, naturalHeight)) * scale;
  const drawWidth = naturalWidth * drawScale;
  const drawHeight = naturalHeight * drawScale;

  context.save();
  context.globalAlpha = opacity;
  context.translate(width / 2 + transform.x, height / 2 + transform.y);
  context.rotate((Number(transform.rotation) || 0) * Math.PI / 180);
  try {
    context.drawImage(media, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  } catch {
    context.fillStyle = 'rgba(66, 232, 255, 0.14)';
    context.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  }
  context.restore();
}

function drawTextClip(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  clip: ProjectDocument['tracks'][number]['clips'][number]
) {
  const opacity = Math.max(0, Math.min(1, Number(clip.transform.opacity ?? 1)));
  const fontSize = Math.max(18, Math.round(64 * Math.max(0.2, Number(clip.transform.scale) || 1)));
  const styleKey = `${clip.name} ${clip.effects.map((effect) => effect.name).join(' ')}`.toLowerCase();
  const isBoxed = /lower third|callout|creator pop|stream alert|killfeed|hud|caption/.test(styleKey);
  const isCinema = /cinematic|festival|anamorphic|trailer|credit/.test(styleKey);
  context.save();
  context.globalAlpha = opacity;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `${isCinema ? 800 : 900} ${fontSize}px ${isCinema ? 'Georgia, serif' : 'Inter, Segoe UI, sans-serif'}`;
  context.shadowColor = /rank|hud|diamond|neon/.test(styleKey) ? 'rgba(66, 232, 255, 0.95)' : 'rgba(66, 232, 255, 0.7)';
  context.shadowBlur = /trailer|rank|hud|diamond|neon/.test(styleKey) ? 34 : 24;
  context.fillStyle = /creator pop|stream alert/.test(styleKey) ? '#05060a' : clip.color || '#ffffff';
  const text = clip.text || clip.name || 'Text';
  const y = height * (isCinema || /trailer/.test(styleKey) ? 0.48 : 0.72) + clip.transform.y;
  context.translate(width / 2 + clip.transform.x, y);
  context.rotate((Number(clip.transform.rotation) || 0) * Math.PI / 180);
  if (isBoxed) {
    const metrics = context.measureText(text);
    context.fillStyle = /creator pop|stream alert/.test(styleKey) ? '#42e8ff' : 'rgba(5, 8, 16, 0.78)';
    context.fillRect(-metrics.width / 2 - 22, -fontSize * 0.62, metrics.width + 44, fontSize * 1.22);
    context.fillStyle = /creator pop|stream alert/.test(styleKey) ? '#05060a' : clip.color || '#ffffff';
  }
  context.fillText(text, 0, 0, width * 0.9);
  context.restore();
}

function drawFallbackFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  request: BrowserExportRequest,
  progress: number
) {
  const tracks = request.project?.tracks ?? [];
  const clipCount = tracks.reduce((total, track) => total + track.clips.length, 0);
  context.clearRect(0, 0, width, height);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#05060a');
  background.addColorStop(0.52, '#10182d');
  background.addColorStop(1, '#05060a');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.34 + Math.sin(progress * Math.PI * 2) * 0.05;
  context.fillStyle = '#1a6dff';
  context.fillRect(width * 0.14, height * 0.28, width * 0.14, height * 0.32);
  context.fillStyle = '#42e8ff';
  context.fillRect(width * 0.42, height * 0.22, width * 0.16, height * 0.38);
  context.fillStyle = '#8f6bff';
  context.beginPath();
  context.arc(width * 0.72, height * 0.27, height * 0.12, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  context.strokeStyle = 'rgba(65, 232, 255, 0.72)';
  context.lineWidth = Math.max(2, height * 0.004);
  context.strokeRect(width * 0.12, height * 0.16, width * 0.76, height * 0.58);
  context.shadowColor = 'rgba(65, 232, 255, 0.85)';
  context.shadowBlur = height * 0.03;
  context.fillStyle = '#f7ffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `900 ${Math.max(34, Math.round(height * 0.075))}px Inter, Segoe UI, sans-serif`;
  context.fillText(request.projectName.toUpperCase(), width / 2, height * 0.48, width * 0.82);
  context.shadowBlur = 0;
  context.fillStyle = '#aeb9ce';
  context.font = `700 ${Math.max(18, Math.round(height * 0.025))}px Inter, Segoe UI, sans-serif`;
  context.fillText(`${request.resolution ?? `${width} x ${height}`} - ${request.fps ?? 30}fps - ${tracks.length} tracks - ${clipCount} clips`, width / 2, height * 0.6, width * 0.82);

  context.fillStyle = '#42e8ff';
  context.fillRect(width * 0.08, height * 0.8, width * 0.84 * progress, Math.max(3, height * 0.006));
  if (request.watermark !== false) {
    context.textAlign = 'right';
    context.font = `800 ${Math.max(15, Math.round(height * 0.02))}px Inter, Segoe UI, sans-serif`;
    context.fillStyle = '#ffd85d';
    context.fillText('Made with Edify Free', width * 0.96, height * 0.93);
  }
}

function drawBrowserExportFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  request: BrowserExportRequest,
  resources: Map<string, BrowserRenderResource>,
  time: number,
  progress: number
) {
  const tracks = request.project?.tracks ?? [];
  const mediaClips = tracks
    .flatMap((track, trackIndex) =>
      track.hidden ? [] : track.clips.map((clip) => ({ clip, trackIndex }))
    )
    .filter(({ clip }) => (clip.kind === 'video' || clip.kind === 'image') && isClipVisibleAt(clip, time))
    .sort((a, b) => b.trackIndex - a.trackIndex || clipStart(a.clip) - clipStart(b.clip));

  const textClips = tracks
    .flatMap((track, trackIndex) =>
      track.hidden ? [] : track.clips.map((clip) => ({ clip, trackIndex }))
    )
    .filter(({ clip }) => clip.kind === 'text' && isClipVisibleAt(clip, time))
    .sort((a, b) => b.trackIndex - a.trackIndex || clipStart(a.clip) - clipStart(b.clip));

  if (mediaClips.length === 0 && textClips.length === 0) {
    drawFallbackFrame(context, width, height, request, progress);
    return;
  }

  context.fillStyle = request.project?.settings.backgroundColor || '#05060a';
  context.fillRect(0, 0, width, height);

  for (const { clip } of mediaClips) {
    const resource = clip.assetId ? resources.get(clip.assetId) : undefined;
    const media = resource?.media;
    if (!media) continue;

    if (media instanceof HTMLVideoElement) {
      const localTime = Math.max(0, clip.inPoint + time - clipStart(clip));
      if (Number.isFinite(media.duration) && media.duration > 0) {
        const targetTime = Math.min(localTime, Math.max(0, media.duration - 0.05));
        if (Math.abs(media.currentTime - targetTime) > 0.18) {
          try {
            media.currentTime = targetTime;
          } catch {
            // Browser seeking can fail briefly while metadata warms up.
          }
        }
      }
      if (media.readyState < 2) continue;
      drawCoverMedia(context, media, width, height, clip, media.videoWidth || width, media.videoHeight || height);
    } else {
      drawCoverMedia(context, media, width, height, clip, media.naturalWidth || width, media.naturalHeight || height);
    }
  }

  textClips.forEach(({ clip }) => drawTextClip(context, width, height, clip));

  if (request.watermark !== false) {
    context.textAlign = 'right';
    context.font = `800 ${Math.max(15, Math.round(height * 0.02))}px Inter, Segoe UI, sans-serif`;
    context.fillStyle = '#ffd85d';
    context.fillText('Made with Edify Free', width * 0.96, height * 0.93);
  }
}

async function runBrowserVideoExport(fileName: string, request: BrowserExportRequest, onProgress: (progress: number) => void) {
  const { width, height } = parseResolution(request.resolution);
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(width, 1920);
  canvas.height = Math.min(height, 1080);
  const context = canvas.getContext('2d');
  const stream = canvas.captureStream(Math.max(1, Math.min(60, request.fps ?? 30)));
  const resources = await prepareBrowserResources(request.project);
  if (context) drawBrowserExportFrame(context, canvas.width, canvas.height, request, resources, 0, 0.001);
  const { mimeType } = pickBrowserVideoMime();
  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: parseMbps(request.bitrate) * 1_000_000
  };
  if (mimeType) recorderOptions.mimeType = mimeType;
  const recorder = new MediaRecorder(stream, recorderOptions);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.onstop = async () => {
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
    if (blob.size <= 0) {
      releaseBrowserResources(resources);
      onProgress(-1);
      return;
    }
    const fixedBlob = await fixWebmDuration(blob, durationMs, { logger: false }).catch(() => blob);
    const url = URL.createObjectURL(fixedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    releaseBrowserResources(resources);
    onProgress(100);
  };
  recorder.start(250);
  const durationSeconds = Math.max(1, request.project?.duration ?? 8);
  const durationMs = durationSeconds * 1000;
  const startedAt = performance.now();
  const render = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    if (context) drawBrowserExportFrame(context, canvas.width, canvas.height, request, resources, progress * durationSeconds, progress);
    onProgress(Math.min(99, Math.max(1, Math.round(progress * 100))));
    if (progress >= 1) {
      if (recorder.state === 'recording') {
        recorder.requestData();
        window.setTimeout(() => recorder.state === 'recording' && recorder.stop(), 250);
      }
      return;
    }
    window.requestAnimationFrame(render);
  };
  window.requestAnimationFrame(render);
}

function browserAssetFromFile(file: File): MediaAsset {
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() : undefined;
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const kind =
    mime.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/.test(name)
      ? 'video'
      : mime.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg)$/.test(name)
        ? 'audio'
        : mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name)
          ? 'image'
          : 'unknown';

  return {
    id: `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    kind,
    path: `browser-file://${file.name}`,
    previewUrl: URL.createObjectURL(file),
    thumbnailUrl: kind === 'image' ? URL.createObjectURL(file) : undefined,
    size: file.size,
    extension,
    importedAt: new Date().toISOString(),
    duration: kind === 'image' ? 5 : undefined,
    dimensions: kind === 'image' || kind === 'video' ? { width: 1920, height: 1080 } : undefined
  };
}

const browserFallback = {
  async bootstrap(): Promise<BootstrapInfo> {
    return {
      appVersion: 'browser-preview',
      platform: 'browser',
      paths: {
        projects: 'Documents/Edify Projects',
        cache: 'Edify Cache',
        userData: 'Browser localStorage',
        autosave: 'localStorage:edify-autosave'
      },
      settings: JSON.parse(localStorage.getItem('edify-settings') ?? 'null') ?? {
        uiScale: 1,
        previewQuality: 'Half',
        hardwareAcceleration: true,
        autosaveMinutes: 2
      },
      recentProjects: JSON.parse(localStorage.getItem('edify-recent') ?? '[]'),
      recoveryAvailable: Boolean(localStorage.getItem('edify-autosave'))
    };
  },
  async saveProject(document: ProjectDocument, _filePath?: string) {
    localStorage.setItem('edify-demo-project', JSON.stringify(document));
    const recent = [
      {
        id: document.id,
        name: document.name,
        path: 'browser://edify-demo-project',
        updatedAt: new Date().toISOString(),
        thumbnail: document.thumbnail
      }
    ];
    localStorage.setItem('edify-recent', JSON.stringify(recent));
    return {
      canceled: false,
      filePath: 'browser://edify-demo-project',
      document: {
        ...document,
        path: 'browser://edify-demo-project',
        updatedAt: new Date().toISOString()
      }
    };
  },
  async saveProjectAs(document: ProjectDocument) {
    return this.saveProject(document);
  },
  async openProjectDialog() {
    const raw = localStorage.getItem('edify-demo-project');
    return raw
      ? { canceled: false, filePath: 'browser://edify-demo-project', document: JSON.parse(raw) }
      : { canceled: true };
  },
  async openProjectPath() {
    const raw = localStorage.getItem('edify-demo-project');
    return raw
      ? { filePath: 'browser://edify-demo-project', document: JSON.parse(raw) }
      : Promise.reject(new Error('No browser project saved yet.'));
  },
  async renameProject(_filePath: string, name: string) {
    const raw = localStorage.getItem('edify-demo-project');
    if (!raw) return { filePath: 'browser://edify-demo-project', document: null, recentProjects: [] };
    const document = {
      ...JSON.parse(raw),
      name,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('edify-demo-project', JSON.stringify(document));
    const recent = [{ id: document.id, name, path: 'browser://edify-demo-project', updatedAt: document.updatedAt, thumbnail: document.thumbnail }];
    localStorage.setItem('edify-recent', JSON.stringify(recent));
    return { filePath: 'browser://edify-demo-project', document, recentProjects: recent };
  },
  async deleteProject(filePath: string) {
    if (filePath === 'browser://edify-demo-project') {
      localStorage.removeItem('edify-demo-project');
    }
    localStorage.setItem('edify-recent', JSON.stringify([]));
    return { ok: true, recentProjects: [] };
  },
  async importMedia() {
    return new Promise<MediaAsset[]>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'video/*,audio/*,image/*,.mp4,.mov,.mkv,.webm,.avi,.mp3,.wav,.m4a,.png,.jpg,.jpeg,.webp,.gif';
      input.onchange = () => resolve(Array.from(input.files ?? []).map(browserAssetFromFile));
      input.click();
    });
  },
  async inspectDroppedFiles() {
    return [];
  },
  getPathForFile(file: File) {
    return (file as File & { path?: string }).path ?? '';
  },
  async saveRecording(name: string, buffer: ArrayBuffer) {
    const blob = new Blob([buffer], { type: 'audio/webm' });
    return {
      id: `recording-${Date.now()}`,
      name: `${name}.webm`,
      kind: 'audio',
      path: `browser-recording://${name}`,
      previewUrl: URL.createObjectURL(blob),
      size: buffer.byteLength,
      extension: 'WEBM',
      importedAt: new Date().toISOString(),
      duration: 8
    };
  },
  async relinkMedia() {
    return { canceled: true };
  },
  async writeAutosave(document: ProjectDocument) {
    localStorage.setItem('edify-autosave', JSON.stringify(document));
    return { ok: true };
  },
  async readAutosave() {
    const raw = localStorage.getItem('edify-autosave');
    return raw ? JSON.parse(raw) : null;
  },
  async clearAutosave() {
    localStorage.removeItem('edify-autosave');
    return { ok: true };
  },
  async setSetting(key: string, value: unknown) {
    const info = await this.bootstrap();
    const settings = { ...info.settings, [key]: value };
    localStorage.setItem('edify-settings', JSON.stringify(settings));
    return settings;
  },
  async showItemInFolder(filePath?: string) {
    if (filePath) {
      console.info('Browser preview export location:', filePath);
    }
    return { ok: true };
  },
  async chooseExportPath(request: { fileName: string; format?: string }) {
    return { canceled: false, filePath: request.fileName };
  },
  async startExport(request: {
    projectName: string;
    fileName?: string;
    preset?: string;
    outputPath?: string;
    format?: string;
    resolution?: string;
    fps?: number;
    bitrate?: string;
    quality?: string;
    codec?: string;
    audioCodec?: string;
    range?: string;
    includeAudio?: boolean;
    burnCaptions?: boolean;
    estimatedSizeMb?: number;
    watermark?: boolean;
    project?: ProjectDocument;
  }) {
    const extension = request.format ?? 'mp4';
    const requestedOutput = request.outputPath || request.fileName || `${request.projectName}.${extension}`;
    const { extension: actualExtension } = pickBrowserVideoMime();
    const outputPath = replaceOutputExtension(requestedOutput, actualExtension);
    const jobId = `browser-export-${Date.now()}`;
    window.setTimeout(() => {
      void runBrowserVideoExport(outputPath.split(/[\\/]/).pop() ?? outputPath, request, (progress) => {
        window.dispatchEvent(
          new CustomEvent('edify-browser-export-progress', {
            detail: {
              jobId,
              progress: progress < 0 ? 100 : progress,
              outputPath: progress < 0 ? 'Browser export failed: empty video file. Try the .exe exporter for this project.' : outputPath,
              state: progress < 0 ? 'failed' : progress >= 100 ? 'complete' : 'rendering'
            }
          })
        );
      }).catch((error) => {
        window.dispatchEvent(
          new CustomEvent('edify-browser-export-progress', {
            detail: {
              jobId,
              progress: 100,
              outputPath: error instanceof Error ? error.message : 'Browser export failed',
              state: 'failed'
            }
          })
        );
      });
    }, 10);
    return { canceled: false, jobId, outputPath };
  },
  async cancelExport() {
    return { ok: true };
  },
  async windowMinimize() {
    return { ok: true };
  },
  async windowClose() {
    window.close();
    return { ok: true };
  },
  onExportProgress(callback: (payload: unknown) => void) {
    const listener = (event: Event) => callback((event as CustomEvent).detail);
    window.addEventListener('edify-browser-export-progress', listener);
    return () => window.removeEventListener('edify-browser-export-progress', listener);
  }
};

export const edifyApi = window.edify ?? browserFallback;
