import { useCallback, useMemo, useState } from 'react';
import { renderStudioProjectSvg } from '../lib/studioExport';
import { createDemoStudioProject } from './demoStudioProject';
import type {
  StudioAdjustmentLayer,
  StudioAiHistoryEntry,
  StudioAdjustments,
  StudioBlendMode,
  StudioExportPreset,
  StudioFilterSettings,
  StudioGroupLayer,
  StudioGuide,
  StudioImageLayer,
  StudioLayer,
  StudioPoint,
  StudioProject,
  StudioSelectionInfo,
  StudioShapeKind,
  StudioShapeLayer,
  StudioTextLayer,
  StudioTheme,
  StudioToolId
} from '../types/studio';

const exportPresets: StudioExportPreset[] = [
  { id: 'youtube-thumb', label: 'YouTube Thumbnail 1280x720', width: 1280, height: 720 },
  { id: 'discord-banner', label: 'Discord Banner 960x540', width: 960, height: 540 },
  { id: 'roblox-icon', label: 'Roblox Icon 512x512', width: 512, height: 512 },
  { id: 'roblox-thumb', label: 'Roblox Thumbnail 1920x1080', width: 1920, height: 1080 },
  { id: 'instagram-post', label: 'Instagram Post 1080x1080', width: 1080, height: 1080 },
  { id: 'tiktok-cover', label: 'TikTok Cover 1080x1920', width: 1080, height: 1920 },
  { id: 'custom', label: 'Custom', width: 1280, height: 720 }
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function cloneProject(project: StudioProject): StudioProject {
  return JSON.parse(JSON.stringify(project)) as StudioProject;
}

function cloneLayer<T extends StudioLayer>(layer: T): T {
  return JSON.parse(JSON.stringify(layer)) as T;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function moveArray<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function findLayer(project: StudioProject, layerId?: string | null) {
  return project.layers.find((layer) => layer.id === layerId) ?? null;
}

function createDefaultFilters(overrides: Partial<StudioFilterSettings> = {}): StudioFilterSettings {
  return {
    gaussianBlur: 0,
    motionBlur: 0,
    radialBlur: 0,
    lensBlur: 0,
    pixelate: 0,
    noise: 0,
    sharpen: 0,
    edgeDetect: 0,
    glow: 0,
    bloom: 0,
    dropShadow: 0,
    innerShadow: 0,
    stroke: 0,
    outline: 0,
    bevel: 0,
    emboss: 0,
    backgroundBlur: 0,
    duotone: 0,
    vintage: 0,
    cinematic: 0,
    robloxGlow: 0,
    youtubeEnhance: 0,
    ...overrides
  };
}

function createDefaultAdjustments(overrides: Partial<StudioAdjustments> = {}): StudioAdjustments {
  return {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    exposure: 0,
    gamma: 1,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    highlights: 0,
    shadows: 0,
    clarity: 0,
    dehaze: 0,
    grain: 0,
    vignette: 0,
    blackAndWhite: 0,
    invert: 0,
    posterize: 0,
    threshold: 0,
    curvesLift: 0,
    curvesMid: 0,
    curvesGain: 0,
    levelsBlack: 0,
    levelsWhite: 100,
    levelsGamma: 1,
    colorBalanceRed: 0,
    colorBalanceGreen: 0,
    colorBalanceBlue: 0,
    selectiveColor: 0,
    ...overrides
  };
}

function createAiPreviewDataUrl(action: StudioAiHistoryEntry['action'], prompt: string) {
  const title = prompt.trim() || action.replace(/-/g, ' ');
  const accent =
    action === 'face-enhance' ? '#ffd166'
      : action === 'replace-background' ? '#8f7cff'
      : action === 'upscale' ? '#4ff7d0'
      : '#42e8ff';

  const subtitle =
    action === 'subject-select' ? 'Layer-ready subject result'
      : action === 'background-remover' ? 'Background removed preview'
      : action === 'generative-fill' ? 'Generated fill concept'
      : 'AI preview layer';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#08101d"/>
          <stop offset="55%" stop-color="#183768"/>
          <stop offset="100%" stop-color="#311d59"/>
        </linearGradient>
        <radialGradient id="glow" cx="78%" cy="24%" r="42%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect width="1280" height="720" fill="url(#glow)"/>
      <rect x="118" y="104" width="1044" height="512" rx="34" fill="rgba(7,10,18,0.74)" stroke="${accent}" stroke-opacity="0.6" stroke-width="4"/>
      <rect x="168" y="174" width="270" height="340" rx="24" fill="rgba(255,255,255,0.08)"/>
      <rect x="506" y="160" width="464" height="44" rx="16" fill="rgba(255,255,255,0.08)"/>
      <rect x="506" y="226" width="392" height="28" rx="14" fill="rgba(255,255,255,0.06)"/>
      <rect x="506" y="286" width="504" height="132" rx="20" fill="rgba(255,255,255,0.05)"/>
      <text x="506" y="505" fill="#f7fbff" font-size="70" font-weight="900" font-family="Inter, Segoe UI, sans-serif">${title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</text>
      <text x="506" y="558" fill="#d8e4ff" font-size="28" font-weight="600" font-family="Inter, Segoe UI, sans-serif">${subtitle}</text>
      <rect x="930" y="470" width="176" height="62" rx="18" fill="rgba(7,10,18,0.78)" stroke="${accent}" stroke-width="3"/>
      <text x="1018" y="510" text-anchor="middle" fill="${accent}" font-size="26" font-weight="800" font-family="Inter, Segoe UI, sans-serif">AI RESULT</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createGradientDataUrl(start: string, end: string, angle = 135) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">
          <stop offset="0%" stop-color="${start}"/>
          <stop offset="100%" stop-color="${end}"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#g)"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildLayerBounds(layers: StudioLayer[]) {
  if (layers.length === 0) return null;
  const left = Math.min(...layers.map((layer) => layer.x));
  const top = Math.min(...layers.map((layer) => layer.y));
  const right = Math.max(...layers.map((layer) => layer.x + layer.width));
  const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));
  return {
    x: left,
    y: top,
    width: Math.max(24, right - left),
    height: Math.max(24, bottom - top)
  };
}

export function useStudioState(initialProject?: StudioProject | null) {
  const [project, setProject] = useState<StudioProject>(cloneProject(initialProject ?? createDemoStudioProject()));
  const [selection, setSelection] = useState<StudioSelectionInfo>({ ids: [], primaryId: undefined });
  const [activeTool, setActiveTool] = useState<StudioToolId>('move');
  const [theme, setTheme] = useState<StudioTheme>((initialProject ?? createDemoStudioProject()).theme);
  const [history, setHistory] = useState<StudioProject[]>([]);
  const [future, setFuture] = useState<StudioProject[]>([]);
  const [guides, setGuides] = useState<StudioGuide[]>([]);
  const [beforeAfter, setBeforeAfter] = useState(false);
  const [promptHistory, setPromptHistory] = useState<StudioAiHistoryEntry[]>(project.promptHistory ?? []);
  const [clipboardLayers, setClipboardLayers] = useState<StudioLayer[]>([]);
  const [activeColor, setActiveColor] = useState('#42e8ff');
  const [secondaryColor, setSecondaryColor] = useState('#8f7cff');
  const [brushSettings, setBrushSettings] = useState({ size: 48, hardness: 72, opacity: 1 });

  const applyProject = useCallback((updater: (current: StudioProject) => StudioProject, commit = true) => {
    setProject((current) => {
      const base = cloneProject(current);
      const next = updater(base);
      next.updatedAt = new Date().toISOString();
      if (commit) {
        setHistory((items) => [...items.slice(-39), cloneProject(current)]);
        setFuture([]);
      }
      return next;
    });
  }, []);

  const selectedLayers = useMemo(
    () => project.layers.filter((layer) => selection.ids.includes(layer.id)),
    [project.layers, selection.ids]
  );

  const primaryLayer = useMemo(
    () => findLayer(project, selection.primaryId ?? selection.ids[0]),
    [project, selection]
  );

  const selectLayer = useCallback((layerId: string, additive = false) => {
    setSelection((current) => {
      if (!additive) return { ids: [layerId], primaryId: layerId };
      const exists = current.ids.includes(layerId);
      const ids = exists ? current.ids.filter((id) => id !== layerId) : [...current.ids, layerId];
      return { ids, primaryId: layerId };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({ ids: [], primaryId: undefined });
  }, []);

  const selectMany = useCallback((ids: string[]) => {
    setSelection({ ids, primaryId: ids[ids.length - 1] });
  }, []);

  const selectAllLayers = useCallback(() => {
    const ids = project.layers.filter((layer) => layer.visible).map((layer) => layer.id);
    setSelection({ ids, primaryId: ids[ids.length - 1] });
  }, [project.layers]);

  const deselect = useCallback(() => {
    setSelection({ ids: [], primaryId: undefined });
  }, []);

  const selectRelativeLayer = useCallback((direction: 1 | -1) => {
    const currentId = selection.primaryId ?? selection.ids[0];
    const currentIndex = project.layers.findIndex((layer) => layer.id === currentId);
    if (currentIndex < 0) {
      const fallback = direction > 0 ? project.layers.at(-1) : project.layers[0];
      if (fallback) setSelection({ ids: [fallback.id], primaryId: fallback.id });
      return;
    }
    const nextIndex = clamp(currentIndex + direction, 0, project.layers.length - 1);
    const nextLayer = project.layers[nextIndex];
    if (nextLayer) setSelection({ ids: [nextLayer.id], primaryId: nextLayer.id });
  }, [project.layers, selection.ids, selection.primaryId]);

  const setCanvasZoom = useCallback((zoom: number) => {
    applyProject((current) => ({
      ...current,
      canvas: {
        ...current.canvas,
        zoom: clamp(zoom, 0.15, 6)
      }
    }), false);
  }, [applyProject]);

  const setCanvasPan = useCallback((panX: number, panY: number) => {
    applyProject((current) => ({
      ...current,
      canvas: {
        ...current.canvas,
        panX,
        panY
      }
    }), false);
  }, [applyProject]);

  const fitCanvasToScreen = useCallback(() => {
    applyProject((current) => ({
      ...current,
      canvas: {
        ...current.canvas,
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }), true);
  }, [applyProject]);

  const setCanvasTo100 = useCallback(() => {
    applyProject((current) => ({
      ...current,
      canvas: {
        ...current.canvas,
        zoom: 1
      }
    }), true);
  }, [applyProject]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    applyProject((current) => ({
      ...current,
      theme: current.theme === 'dark' ? 'light' : 'dark'
    }), false);
  }, [applyProject]);

  const toggleCanvasGrid = useCallback(() => {
    applyProject((current) => ({
      ...current,
      canvas: { ...current.canvas, showGrid: !current.canvas.showGrid }
    }), true);
  }, [applyProject]);

  const toggleCanvasRulers = useCallback(() => {
    applyProject((current) => ({
      ...current,
      canvas: { ...current.canvas, showRulers: !current.canvas.showRulers }
    }), true);
  }, [applyProject]);

  const toggleCanvasGuides = useCallback(() => {
    applyProject((current) => ({
      ...current,
      canvas: { ...current.canvas, showGuides: !current.canvas.showGuides }
    }), true);
  }, [applyProject]);

  const toggleCanvasSnap = useCallback(() => {
    applyProject((current) => ({
      ...current,
      canvas: { ...current.canvas, snap: !current.canvas.snap }
    }), true);
  }, [applyProject]);

  const toggleCanvasTransparent = useCallback(() => {
    applyProject((current) => ({
      ...current,
      canvas: { ...current.canvas, transparent: !current.canvas.transparent }
    }), true);
  }, [applyProject]);

  const setCanvasBackgroundColor = useCallback((color: string) => {
    applyProject((current) => ({
      ...current,
      canvas: { ...current.canvas, background: color, transparent: false }
    }), true);
  }, [applyProject]);

  const rotateCanvas = useCallback((delta: number) => {
    applyProject((current) => ({
      ...current,
      canvas: { ...current.canvas, rotation: current.canvas.rotation + delta }
    }), true);
  }, [applyProject]);

  const setProjectPreset = useCallback((presetId: StudioExportPreset['id']) => {
    const preset = exportPresets.find((item) => item.id === presetId);
    if (!preset) return;
    applyProject((current) => ({
      ...current,
      canvas: {
        ...current.canvas,
        width: preset.width,
        height: preset.height
      }
    }));
  }, [applyProject]);

  const setCustomCanvasSize = useCallback((width: number, height: number) => {
    applyProject((current) => ({
      ...current,
      canvas: {
        ...current.canvas,
        width: Math.max(64, Math.round(width)),
        height: Math.max(64, Math.round(height))
      }
    }), true);
  }, [applyProject]);

  const cropCanvasToRect = useCallback((rect: { x: number; y: number; width: number; height: number }) => {
    if (rect.width < 24 || rect.height < 24) return;
    applyProject((current) => ({
      ...current,
      canvas: {
        ...current.canvas,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        panX: 0,
        panY: 0
      },
      layers: current.layers.map((layer) => ({
        ...layer,
        x: layer.x - rect.x,
        y: layer.y - rect.y
      }))
    }), true);
  }, [applyProject]);

  const updateLayer = useCallback((layerId: string, updater: (layer: StudioLayer) => StudioLayer, commit = false) => {
    applyProject((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === layerId ? updater(cloneLayer(layer)) : layer))
    }), commit);
  }, [applyProject]);

  const updateSelectedLayers = useCallback((updater: (layer: StudioLayer) => StudioLayer, commit = false) => {
    if (selection.ids.length === 0) return;
    applyProject((current) => ({
      ...current,
      layers: current.layers.map((layer) => (selection.ids.includes(layer.id) ? updater(cloneLayer(layer)) : layer))
    }), commit);
  }, [applyProject, selection.ids]);

  const addTextLayer = useCallback((text = 'NEW HEADLINE', position?: StudioPoint) => {
    const layer: StudioTextLayer = {
      id: createId('text'),
      kind: 'text',
      name: 'Text layer',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: position?.x ?? 180,
      y: position?.y ?? 180,
      width: 420,
      height: 120,
      rotation: 0,
      filters: createDefaultFilters({ glow: 18, dropShadow: 8 }),
      adjustments: createDefaultAdjustments(),
      text,
      fontFamily: 'Inter, Segoe UI, sans-serif',
      fontSize: 78,
      fontWeight: 900,
      italic: false,
      underline: false,
      align: 'left',
      color: '#ffffff',
      gradientText: false,
      gradientStart: '#ffffff',
      gradientEnd: '#7de7ff',
      strokeColor: '#0d111d',
      strokeWidth: 0,
      shadowColor: '#09101c',
      shadowBlur: 12,
      glowColor: '#42e8ff',
      glowStrength: 18,
      letterSpacing: 0,
      lineHeight: 1.05,
      curvedText: 0,
      stylePreset: 'apple-clean'
    };
    applyProject((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelection({ ids: [layer.id], primaryId: layer.id });
    setActiveTool('move');
  }, [applyProject]);

  const addShapeLayer = useCallback((shape: StudioShapeKind, position?: StudioPoint) => {
    const layer: StudioShapeLayer = {
      id: createId('shape'),
      kind: 'shape',
      name: `${shape} layer`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: position?.x ?? 220,
      y: position?.y ?? 180,
      width: shape === 'line' || shape === 'arrow' ? 360 : 280,
      height: shape === 'line' || shape === 'arrow' ? 90 : 180,
      rotation: 0,
      filters: createDefaultFilters({ glow: 12, dropShadow: 6 }),
      adjustments: createDefaultAdjustments(),
      shape,
      fill: shape === 'line' ? 'transparent' : activeColor,
      strokeColor: secondaryColor,
      strokeWidth: shape === 'line' || shape === 'arrow' ? 8 : 2,
      radius: shape === 'rounded-rectangle' ? 28 : 0,
      points: shape === 'polygon'
        ? [
            { x: 0, y: 0 },
            { x: 220, y: 40 },
            { x: 180, y: 160 },
            { x: 34, y: 150 }
          ]
        : undefined
    };
    applyProject((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelection({ ids: [layer.id], primaryId: layer.id });
    setActiveTool('move');
  }, [activeColor, applyProject, secondaryColor]);

  const addGradientLayer = useCallback((position?: StudioPoint) => {
    const width = Math.round(project.canvas.width * 0.62);
    const height = Math.round(project.canvas.height * 0.42);
    const layer: StudioImageLayer = {
      id: createId('gradient'),
      kind: 'image',
      name: 'Gradient overlay',
      visible: true,
      locked: false,
      opacity: 0.92,
      blendMode: 'screen',
      x: position?.x ?? 140,
      y: position?.y ?? 110,
      width,
      height,
      rotation: 0,
      fit: 'cover',
      src: createGradientDataUrl(activeColor, secondaryColor, 135),
      filters: createDefaultFilters({ glow: 12 }),
      adjustments: createDefaultAdjustments()
    };
    applyProject((current) => ({ ...current, layers: [...current.layers, layer] }), true);
    setSelection({ ids: [layer.id], primaryId: layer.id });
  }, [activeColor, applyProject, project.canvas.height, project.canvas.width, secondaryColor]);

  const addAdjustmentLayer = useCallback((label = 'Adjustment layer') => {
    const layer: StudioAdjustmentLayer = {
      id: createId('adjustment'),
      kind: 'adjustment',
      name: label,
      visible: true,
      locked: false,
      opacity: 0.5,
      blendMode: 'overlay',
      x: 0,
      y: 0,
      width: project.canvas.width,
      height: project.canvas.height,
      rotation: 0,
      filters: createDefaultFilters({ cinematic: 22 }),
      adjustments: createDefaultAdjustments({ vibrance: 12, contrast: 8 }),
      target: 'all-below',
      label
    };
    applyProject((current) => ({ ...current, layers: [...current.layers, layer] }), true);
    setSelection({ ids: [layer.id], primaryId: layer.id });
  }, [applyProject, project.canvas.height, project.canvas.width]);

  const addGroupLayer = useCallback((name = 'Layer group') => {
    const bounds = buildLayerBounds(selectedLayers.length ? selectedLayers : project.layers) ?? {
      x: 120,
      y: 120,
      width: 420,
      height: 260
    };
    const layer: StudioGroupLayer = {
      id: createId('group'),
      kind: 'group',
      name,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      filters: createDefaultFilters(),
      adjustments: createDefaultAdjustments(),
      expanded: true
    };
    applyProject((current) => ({ ...current, layers: [...current.layers, layer] }), true);
    setSelection({ ids: [layer.id], primaryId: layer.id });
  }, [applyProject, project.layers, selectedLayers]);

  const addImageLayer = useCallback((payload: { name: string; src: string; width?: number; height?: number; x?: number; y?: number }) => {
    const layer: StudioImageLayer = {
      id: createId('image'),
      kind: 'image',
      name: payload.name,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: payload.x ?? 180,
      y: payload.y ?? 140,
      width: payload.width ?? 520,
      height: payload.height ?? 320,
      rotation: 0,
      fit: 'cover',
      src: payload.src,
      filters: createDefaultFilters({ dropShadow: 10 }),
      adjustments: createDefaultAdjustments()
    };
    applyProject((current) => ({
      ...current,
      assets: [
        ...current.assets,
        {
          id: createId('asset'),
          name: payload.name,
          src: payload.src,
          kind: payload.src.includes('svg') ? 'svg' : 'image',
          importedAt: new Date().toISOString(),
          width: payload.width,
          height: payload.height
        }
      ],
      layers: [...current.layers, layer]
    }), true);
    setSelection({ ids: [layer.id], primaryId: layer.id });
    setActiveTool('move');
  }, [applyProject]);

  const duplicateSelection = useCallback(() => {
    if (selection.ids.length === 0) return;
    const cloneIds: string[] = [];
    applyProject((current) => {
      const clones = current.layers
        .filter((layer) => selection.ids.includes(layer.id))
        .map((layer) => {
          const clone = cloneLayer(layer);
          clone.id = createId(layer.kind);
          clone.name = `${layer.name} copy`;
          clone.x += 26;
          clone.y += 26;
          cloneIds.push(clone.id);
          return clone;
        });
      return { ...current, layers: [...current.layers, ...clones] };
    }, true);
    if (cloneIds.length) setSelection({ ids: cloneIds, primaryId: cloneIds[cloneIds.length - 1] });
  }, [applyProject, selection.ids]);

  const deleteSelection = useCallback(() => {
    if (selection.ids.length === 0) return;
    applyProject((current) => ({
      ...current,
      layers: current.layers.filter((layer) => !selection.ids.includes(layer.id) && !(layer.parentId && selection.ids.includes(layer.parentId)))
    }), true);
    clearSelection();
  }, [applyProject, clearSelection, selection.ids]);

  const copySelection = useCallback(() => {
    if (selection.ids.length === 0) return;
    const copies = project.layers
      .filter((layer) => selection.ids.includes(layer.id))
      .map((layer) => cloneLayer(layer));
    setClipboardLayers(copies);
  }, [project.layers, selection.ids]);

  const cutSelection = useCallback(() => {
    copySelection();
    deleteSelection();
  }, [copySelection, deleteSelection]);

  const pasteClipboard = useCallback(() => {
    if (clipboardLayers.length === 0) return;
    const pastedIds: string[] = [];
    applyProject((current) => {
      const clones = clipboardLayers.map((layer) => {
        const clone = cloneLayer(layer);
        clone.id = createId(layer.kind);
        clone.name = `${layer.name} paste`;
        clone.x += 32;
        clone.y += 32;
        pastedIds.push(clone.id);
        return clone;
      });
      return { ...current, layers: [...current.layers, ...clones] };
    }, true);
    if (pastedIds.length) setSelection({ ids: pastedIds, primaryId: pastedIds[pastedIds.length - 1] });
  }, [applyProject, clipboardLayers]);

  const reorderLayer = useCallback((layerId: string, direction: -1 | 1) => {
    applyProject((current) => {
      const index = current.layers.findIndex((layer) => layer.id === layerId);
      if (index < 0) return current;
      const nextIndex = clamp(index + direction, 0, current.layers.length - 1);
      return { ...current, layers: moveArray(current.layers, index, nextIndex) };
    }, true);
  }, [applyProject]);

  const moveSelectionStack = useCallback((mode: 'up' | 'down' | 'front' | 'back') => {
    if (selection.ids.length === 0) return;
    applyProject((current) => {
      const indices = current.layers
        .map((layer, index) => ({ id: layer.id, index }))
        .filter((entry) => selection.ids.includes(entry.id));
      if (indices.length === 0) return current;
      let nextLayers = [...current.layers];
      if (mode === 'up') {
        [...indices].sort((a, b) => b.index - a.index).forEach(({ index }) => {
          if (index < nextLayers.length - 1) nextLayers = moveArray(nextLayers, index, index + 1);
        });
      } else if (mode === 'down') {
        [...indices].sort((a, b) => a.index - b.index).forEach(({ index }) => {
          if (index > 0) nextLayers = moveArray(nextLayers, index, index - 1);
        });
      } else {
        const selected = nextLayers.filter((layer) => selection.ids.includes(layer.id));
        const unselected = nextLayers.filter((layer) => !selection.ids.includes(layer.id));
        nextLayers = mode === 'front' ? [...unselected, ...selected] : [...selected, ...unselected];
      }
      return { ...current, layers: nextLayers };
    }, true);
  }, [applyProject, selection.ids]);

  const moveSelectionBy = useCallback((deltaX: number, deltaY: number, commit = false) => {
    if (selection.ids.length === 0) return;
    const nextGuides: StudioGuide[] = [];
    updateSelectedLayers((layer) => {
      const gridSize = 12;
      let x = layer.x + deltaX;
      let y = layer.y + deltaY;
      const centerX = x + layer.width / 2;
      const centerY = y + layer.height / 2;
      const canvasMidX = project.canvas.width / 2;
      const canvasMidY = project.canvas.height / 2;
      if (project.canvas.snap && Math.abs(centerX - canvasMidX) < 10) {
        x = canvasMidX - layer.width / 2;
        nextGuides.push({ type: 'vertical', value: canvasMidX });
      } else if (project.canvas.snap) {
        x = Math.round(x / gridSize) * gridSize;
      }
      if (project.canvas.snap && Math.abs(centerY - canvasMidY) < 10) {
        y = canvasMidY - layer.height / 2;
        nextGuides.push({ type: 'horizontal', value: canvasMidY });
      } else if (project.canvas.snap) {
        y = Math.round(y / gridSize) * gridSize;
      }
      return { ...layer, x, y };
    }, commit);
    setGuides(nextGuides);
  }, [project.canvas.height, project.canvas.snap, project.canvas.width, selection.ids.length, updateSelectedLayers]);

  const resizePrimaryLayer = useCallback((width: number, height: number, x?: number, y?: number, commit = false) => {
    if (!primaryLayer) return;
    updateLayer(primaryLayer.id, (layer) => ({
      ...layer,
      width: Math.max(24, width),
      height: Math.max(24, height),
      x: typeof x === 'number' ? x : layer.x,
      y: typeof y === 'number' ? y : layer.y
    }), commit);
  }, [primaryLayer, updateLayer]);

  const rotatePrimaryLayer = useCallback((rotation: number, commit = false) => {
    if (!primaryLayer) return;
    updateLayer(primaryLayer.id, (layer) => ({ ...layer, rotation }), commit);
  }, [primaryLayer, updateLayer]);

  const renameLayer = useCallback((layerId: string, name: string) => {
    updateLayer(layerId, (layer) => ({ ...layer, name }), true);
  }, [updateLayer]);

  const toggleLayerVisible = useCallback((layerId: string) => {
    updateLayer(layerId, (layer) => ({ ...layer, visible: !layer.visible }), true);
  }, [updateLayer]);

  const toggleLayerLocked = useCallback((layerId: string) => {
    updateLayer(layerId, (layer) => ({ ...layer, locked: !layer.locked }), true);
  }, [updateLayer]);

  const setLayerBlendMode = useCallback((layerId: string, blendMode: StudioBlendMode) => {
    updateLayer(layerId, (layer) => ({ ...layer, blendMode }), true);
  }, [updateLayer]);

  const groupSelection = useCallback(() => {
    const children = project.layers.filter((layer) => selection.ids.includes(layer.id));
    if (children.length === 0) return;
    const bounds = buildLayerBounds(children);
    if (!bounds) return;
    const groupId = createId('group');
    const group: StudioGroupLayer = {
      id: groupId,
      kind: 'group',
      name: 'Layer group',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      filters: createDefaultFilters(),
      adjustments: createDefaultAdjustments(),
      expanded: true
    };
    applyProject((current) => {
      const firstIndex = current.layers.findIndex((layer) => selection.ids.includes(layer.id));
      const layers = current.layers.map((layer) =>
        selection.ids.includes(layer.id) ? { ...layer, parentId: groupId } : layer
      );
      layers.splice(firstIndex >= 0 ? firstIndex : layers.length, 0, group);
      return { ...current, layers };
    }, true);
    setSelection({ ids: [groupId], primaryId: groupId });
  }, [applyProject, project.layers, selection.ids]);

  const ungroupSelection = useCallback(() => {
    if (selection.ids.length === 0) return;
    applyProject((current) => {
      const groupIds = current.layers
        .filter((layer) => selection.ids.includes(layer.id) && layer.kind === 'group')
        .map((layer) => layer.id);
      return {
        ...current,
        layers: current.layers
          .filter((layer) => !groupIds.includes(layer.id))
          .map((layer) => {
            if (groupIds.includes(layer.parentId ?? '')) {
              return { ...layer, parentId: null };
            }
            if (selection.ids.includes(layer.id) && layer.parentId) {
              return { ...layer, parentId: null };
            }
            return layer;
          })
      };
    }, true);
  }, [applyProject, selection.ids]);

  const createMergedLayerFromIds = useCallback((current: StudioProject, ids: string[], name: string) => {
    const sourceLayers = current.layers.filter((layer) => ids.includes(layer.id) && layer.kind !== 'group' && layer.visible);
    const bounds = buildLayerBounds(sourceLayers);
    if (!bounds || sourceLayers.length === 0) return null;
    const shiftedLayers = sourceLayers.map((layer) => ({
      ...cloneLayer(layer),
      x: layer.x - bounds.x,
      y: layer.y - bounds.y
    }));
    const svg = renderStudioProjectSvg({
      ...current,
      canvas: {
        ...current.canvas,
        width: bounds.width,
        height: bounds.height,
        background: 'transparent',
        transparent: true,
        zoom: 1,
        panX: 0,
        panY: 0,
        rotation: 0,
        showGrid: false,
        showRulers: false,
        showGuides: false,
        snap: false
      },
      layers: shiftedLayers
    }, { hideSelection: true });
    const mergedLayer: StudioImageLayer = {
      id: createId('merged'),
      kind: 'image',
      name,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      fit: 'contain',
      src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      filters: createDefaultFilters(),
      adjustments: createDefaultAdjustments(),
      smartObject: true
    };
    return { mergedLayer, sourceIds: sourceLayers.map((layer) => layer.id) };
  }, []);

  const mergeSelectedLayers = useCallback(() => {
    if (selection.ids.length < 2) return;
    const mergedSelection = createMergedLayerFromIds(project, selection.ids, 'Merged selection');
    if (!mergedSelection) return;
    applyProject((current) => ({
      ...current,
      layers: [
        ...current.layers.filter((layer) => !mergedSelection.sourceIds.includes(layer.id)),
        mergedSelection.mergedLayer
      ]
    }), true);
    setSelection({ ids: [mergedSelection.mergedLayer.id], primaryId: mergedSelection.mergedLayer.id });
  }, [applyProject, createMergedLayerFromIds, project, selection.ids]);

  const mergeVisibleLayers = useCallback(() => {
    const ids = project.layers.filter((layer) => layer.visible && layer.kind !== 'group').map((layer) => layer.id);
    if (ids.length < 2) return;
    const merged = createMergedLayerFromIds(project, ids, 'Merged visible');
    if (!merged) return;
    applyProject((current) => ({
      ...current,
      layers: [
        ...current.layers.filter((layer) => !merged.sourceIds.includes(layer.id)),
        merged.mergedLayer
      ]
    }), true);
    setSelection({ ids: [merged.mergedLayer.id], primaryId: merged.mergedLayer.id });
  }, [applyProject, createMergedLayerFromIds, project]);

  const flattenImage = useCallback(() => {
    const ids = project.layers.filter((layer) => layer.visible && layer.kind !== 'group').map((layer) => layer.id);
    if (ids.length === 0) return;
    const merged = createMergedLayerFromIds(project, ids, 'Flattened image');
    if (!merged) return;
    applyProject((current) => ({
      ...current,
      layers: [merged.mergedLayer]
    }), true);
    setSelection({ ids: [merged.mergedLayer.id], primaryId: merged.mergedLayer.id });
  }, [applyProject, createMergedLayerFromIds, project]);

  const toggleLayerMask = useCallback((layerId: string) => {
    updateLayer(layerId, (layer) => ({ ...layer, maskEnabled: !layer.maskEnabled }), true);
  }, [updateLayer]);

  const applyLayerMask = useCallback((layerId: string) => {
    updateLayer(layerId, (layer) => ({ ...layer, maskEnabled: true, maskApplied: true }), true);
  }, [updateLayer]);

  const invertLayerMask = useCallback((layerId: string) => {
    updateLayer(layerId, (layer) => ({ ...layer, maskEnabled: true, maskInverted: !layer.maskInverted }), true);
  }, [updateLayer]);

  const toggleClippingMask = useCallback((layerId: string) => {
    updateLayer(layerId, (layer) => ({ ...layer, clippingMask: !layer.clippingMask }), true);
  }, [updateLayer]);

  const convertSelectionToSmartObject = useCallback(() => {
    if (selection.ids.length === 0) return;
    updateSelectedLayers((layer) => ({ ...layer, smartObject: !layer.smartObject }), true);
  }, [selection.ids.length, updateSelectedLayers]);

  const alignSelection = useCallback((mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selection.ids.length === 0) return;
    updateSelectedLayers((layer) => {
      switch (mode) {
        case 'left':
          return { ...layer, x: 0 };
        case 'center':
          return { ...layer, x: (project.canvas.width - layer.width) / 2 };
        case 'right':
          return { ...layer, x: project.canvas.width - layer.width };
        case 'top':
          return { ...layer, y: 0 };
        case 'middle':
          return { ...layer, y: (project.canvas.height - layer.height) / 2 };
        case 'bottom':
          return { ...layer, y: project.canvas.height - layer.height };
        default:
          return layer;
      }
    }, true);
  }, [project.canvas.height, project.canvas.width, selection.ids.length, updateSelectedLayers]);

  const distributeSelection = useCallback((axis: 'horizontal' | 'vertical') => {
    if (selection.ids.length < 3) return;
    applyProject((current) => {
      const layers = current.layers
        .filter((layer) => selection.ids.includes(layer.id))
        .sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
      const first = layers[0];
      const last = layers[layers.length - 1];
      const totalSize = layers.reduce((sum, layer) => sum + (axis === 'horizontal' ? layer.width : layer.height), 0);
      const range = (axis === 'horizontal' ? last.x + last.width - first.x : last.y + last.height - first.y) - totalSize;
      const gap = range / Math.max(1, layers.length - 1);
      let cursor = axis === 'horizontal' ? first.x : first.y;
      const positions = new Map<string, number>();
      layers.forEach((layer, index) => {
        if (index === 0) {
          positions.set(layer.id, cursor);
        } else {
          cursor += (axis === 'horizontal' ? layers[index - 1].width : layers[index - 1].height) + gap;
          positions.set(layer.id, cursor);
        }
      });
      return {
        ...current,
        layers: current.layers.map((layer) => {
          const value = positions.get(layer.id);
          if (typeof value !== 'number') return layer;
          return axis === 'horizontal' ? { ...layer, x: value } : { ...layer, y: value };
        })
      };
    }, true);
  }, [applyProject, selection.ids]);

  const autoEnhancePrimary = useCallback(() => {
    if (!primaryLayer) return;
    updateLayer(primaryLayer.id, (layer) => ({
      ...layer,
      adjustments: {
        ...layer.adjustments,
        contrast: clamp(layer.adjustments.contrast + 12, -100, 100),
        clarity: clamp(layer.adjustments.clarity + 18, -100, 100),
        vibrance: clamp(layer.adjustments.vibrance + 14, -100, 100)
      },
      filters: {
        ...layer.filters,
        youtubeEnhance: clamp(layer.filters.youtubeEnhance + 18, 0, 100)
      }
    }), true);
  }, [primaryLayer, updateLayer]);

  const autoColorPrimary = useCallback(() => {
    if (!primaryLayer) return;
    updateLayer(primaryLayer.id, (layer) => ({
      ...layer,
      adjustments: {
        ...layer.adjustments,
        saturation: clamp(layer.adjustments.saturation + 10, -100, 100),
        temperature: clamp(layer.adjustments.temperature + 6, -100, 100),
        tint: clamp(layer.adjustments.tint + 4, -100, 100)
      }
    }), true);
  }, [primaryLayer, updateLayer]);

  const autoContrastPrimary = useCallback(() => {
    if (!primaryLayer) return;
    updateLayer(primaryLayer.id, (layer) => ({
      ...layer,
      adjustments: {
        ...layer.adjustments,
        contrast: clamp(layer.adjustments.contrast + 18, -100, 100),
        levelsBlack: clamp(layer.adjustments.levelsBlack + 4, 0, 100),
        levelsWhite: clamp(layer.adjustments.levelsWhite - 4, 0, 100)
      }
    }), true);
  }, [primaryLayer, updateLayer]);

  const applyTextPreset = useCallback((preset: StudioTextLayer['stylePreset']) => {
    if (!preset || !primaryLayer || primaryLayer.kind !== 'text') return;
    const presetMap: Record<NonNullable<StudioTextLayer['stylePreset']>, Partial<StudioTextLayer>> = {
      'apple-clean': { color: '#ffffff', gradientText: false, fontWeight: 800, glowStrength: 0, strokeWidth: 0 },
      netflix: { color: '#ffffff', fontWeight: 900, strokeColor: '#c51623', strokeWidth: 4, shadowBlur: 18 },
      roblox: { gradientText: true, gradientStart: '#ffe66d', gradientEnd: '#ff6868', strokeColor: '#131722', strokeWidth: 5, glowStrength: 14 },
      neon: { gradientText: true, gradientStart: '#ffffff', gradientEnd: '#7de7ff', glowStrength: 24, strokeWidth: 0 },
      luxury: { gradientText: true, gradientStart: '#fef3c7', gradientEnd: '#caa55a', fontWeight: 700, letterSpacing: 1.6 },
      cyber: { gradientText: true, gradientStart: '#42e8ff', gradientEnd: '#8f7cff', strokeColor: '#09101c', strokeWidth: 2, glowStrength: 20 },
      glass: { color: '#f7fbff', fontWeight: 700, shadowBlur: 8, glowStrength: 12 }
    };
    updateLayer(primaryLayer.id, (layer) => {
      if (layer.kind !== 'text') return layer;
      return {
        ...layer,
        ...(presetMap[preset] as Partial<StudioTextLayer>),
        stylePreset: preset
      };
    }, true);
  }, [primaryLayer, updateLayer]);

  const pickColorFromLayer = useCallback((layerId?: string | null) => {
    const layer = findLayer(project, layerId ?? primaryLayer?.id ?? null);
    if (!layer) return project.canvas.background;
    if (layer.kind === 'text') return layer.color;
    if (layer.kind === 'shape') return layer.fill;
    return project.canvas.background;
  }, [primaryLayer?.id, project]);

  const setPrimaryLayerColor = useCallback((color: string) => {
    if (!primaryLayer) return;
    if (primaryLayer.kind === 'text') {
      updateLayer(primaryLayer.id, (layer) => ({ ...layer, color } as StudioTextLayer), true);
    } else if (primaryLayer.kind === 'shape') {
      updateLayer(primaryLayer.id, (layer) => ({ ...layer, fill: color } as StudioShapeLayer), true);
    } else {
      setCanvasBackgroundColor(color);
    }
    setActiveColor(color);
  }, [primaryLayer, setCanvasBackgroundColor, updateLayer]);

  const applyToolAt = useCallback((tool: StudioToolId, point: StudioPoint, targetLayerId?: string | null) => {
    const targetLayer = findLayer(project, targetLayerId ?? primaryLayer?.id ?? null);
    if (tool === 'eyedropper') {
      const color = pickColorFromLayer(targetLayer?.id);
      setActiveColor(color);
      return;
    }
    if (tool === 'fill') {
      setPrimaryLayerColor(activeColor);
      return;
    }
    if (tool === 'gradient') {
      addGradientLayer({ x: point.x - 60, y: point.y - 40 });
      return;
    }
    if (tool === 'brush') {
      const size = brushSettings.size;
      const dot: StudioShapeLayer = {
        id: createId('brush'),
        kind: 'shape',
        name: 'Brush stroke',
        visible: true,
        locked: false,
        opacity: brushSettings.opacity,
        blendMode: 'normal',
        x: point.x - size / 2,
        y: point.y - size / 2,
        width: size,
        height: size,
        rotation: 0,
        filters: createDefaultFilters({
          gaussianBlur: Math.max(0, (100 - brushSettings.hardness) / 16)
        }),
        adjustments: createDefaultAdjustments(),
        shape: 'ellipse',
        fill: activeColor,
        strokeColor: activeColor,
        strokeWidth: 0
      };
      applyProject((current) => ({ ...current, layers: [...current.layers, dot] }), true);
      setSelection({ ids: [dot.id], primaryId: dot.id });
      return;
    }
    if (tool === 'eraser') {
      if (!targetLayer) return;
      if ((targetLayer.kind === 'shape' && targetLayer.name === 'Brush stroke') || targetLayer.opacity <= 0.16) {
        applyProject((current) => ({
          ...current,
          layers: current.layers.filter((layer) => layer.id !== targetLayer.id)
        }), true);
        clearSelection();
      } else {
        updateLayer(targetLayer.id, (layer) => ({ ...layer, opacity: clamp(layer.opacity - Math.max(0.08, brushSettings.opacity * 0.22), 0, 1) }), true);
      }
      return;
    }
    if (tool === 'clone' && targetLayer) {
      setSelection({ ids: [targetLayer.id], primaryId: targetLayer.id });
      duplicateSelection();
      return;
    }
    if ((tool === 'blur' || tool === 'sharpen' || tool === 'smudge' || tool === 'dodge-burn' || tool === 'healing' || tool === 'red-eye' || tool === 'color-replace') && targetLayer) {
      updateLayer(targetLayer.id, (layer) => {
        if (tool === 'blur') {
          return { ...layer, filters: { ...layer.filters, gaussianBlur: clamp(layer.filters.gaussianBlur + 4, 0, 30) } };
        }
        if (tool === 'sharpen') {
          return { ...layer, filters: { ...layer.filters, sharpen: clamp(layer.filters.sharpen + 8, 0, 100) } };
        }
        if (tool === 'smudge') {
          return { ...layer, filters: { ...layer.filters, motionBlur: clamp(layer.filters.motionBlur + 3, 0, 40) } };
        }
        if (tool === 'dodge-burn') {
          return {
            ...layer,
            adjustments: {
              ...layer.adjustments,
              highlights: clamp(layer.adjustments.highlights + 8, -100, 100),
              shadows: clamp(layer.adjustments.shadows - 6, -100, 100)
            }
          };
        }
        if (tool === 'healing') {
          return {
            ...layer,
            adjustments: {
              ...layer.adjustments,
              clarity: clamp(layer.adjustments.clarity - 10, -100, 100),
              dehaze: clamp(layer.adjustments.dehaze + 6, -100, 100)
            }
          };
        }
        if (tool === 'red-eye') {
          return {
            ...layer,
            adjustments: {
              ...layer.adjustments,
              tint: clamp(layer.adjustments.tint - 8, -100, 100),
              saturation: clamp(layer.adjustments.saturation - 12, -100, 100)
            }
          };
        }
        return {
          ...layer,
          adjustments: {
            ...layer.adjustments,
            hue: clamp(layer.adjustments.hue + 20, -180, 180),
            saturation: clamp(layer.adjustments.saturation + 8, -100, 100)
          }
        };
      }, true);
      return;
    }
    if (tool === 'pen') {
      addShapeLayer('polygon', { x: point.x, y: point.y });
      return;
    }
    if (tool === 'zoom') {
      setCanvasZoom(project.canvas.zoom + 0.2);
    }
  }, [
    activeColor,
    addGradientLayer,
    addShapeLayer,
    brushSettings.hardness,
    brushSettings.opacity,
    brushSettings.size,
    deleteSelection,
    duplicateSelection,
    pickColorFromLayer,
    primaryLayer?.id,
    project,
    clearSelection,
    setCanvasZoom,
    setPrimaryLayerColor,
    updateLayer
  ]);

  const runAiAction = useCallback((entry: Omit<StudioAiHistoryEntry, 'id' | 'createdAt'>) => {
    const sourceLayer = primaryLayer && (primaryLayer.kind === 'image' || primaryLayer.kind === 'ai')
      ? primaryLayer
      : project.layers.find((layer) => layer.kind === 'image' || layer.kind === 'ai') as StudioImageLayer | undefined;
    const resultLayerId = createId('ai');
    const historyEntry = {
      ...entry,
      id: createId('prompt'),
      createdAt: new Date().toISOString(),
      resultLayerId
    };
    if (sourceLayer) {
      const nextLayer: StudioImageLayer = {
        ...cloneLayer(sourceLayer),
        id: resultLayerId,
        kind: 'ai',
        name: `${entry.action} result`,
        x: sourceLayer.x + 28,
        y: sourceLayer.y + 24,
        premium: true,
        adjustments: {
          ...sourceLayer.adjustments,
          clarity: sourceLayer.adjustments.clarity + 8,
          vibrance: sourceLayer.adjustments.vibrance + 10
        },
        filters: {
          ...sourceLayer.filters,
          glow: sourceLayer.filters.glow + (entry.action === 'face-enhance' ? 8 : 0),
          backgroundBlur: entry.action === 'replace-background' ? 18 : sourceLayer.filters.backgroundBlur
        }
      };
      applyProject((current) => ({
        ...current,
        layers: [...current.layers, nextLayer],
        promptHistory: [...current.promptHistory, historyEntry]
      }), true);
      setPromptHistory((current) => [...current, historyEntry]);
      setSelection({ ids: [resultLayerId], primaryId: resultLayerId });
      return resultLayerId;
    }

    const fallbackLayer: StudioImageLayer = {
      id: resultLayerId,
      kind: 'ai',
      name: `${entry.action} result`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 180,
      y: 140,
      width: 640,
      height: 360,
      rotation: 0,
      premium: true,
      fit: 'cover',
      src: createAiPreviewDataUrl(entry.action, entry.prompt),
      filters: createDefaultFilters({
        sharpen: 10,
        glow: 10,
        dropShadow: 12,
        cinematic: 10,
        youtubeEnhance: 16
      }),
      adjustments: createDefaultAdjustments({
        contrast: 6,
        saturation: 4,
        vibrance: 8,
        clarity: 8
      })
    };

    applyProject((current) => ({
      ...current,
      layers: [...current.layers, fallbackLayer],
      promptHistory: [...current.promptHistory, historyEntry]
    }), true);
    setPromptHistory((current) => [...current, historyEntry]);
    setSelection({ ids: [resultLayerId], primaryId: resultLayerId });
    return resultLayerId;
  }, [applyProject, primaryLayer, project.layers]);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.length === 0) return currentHistory;
      const previous = currentHistory[currentHistory.length - 1];
      setFuture((currentFuture) => [cloneProject(project), ...currentFuture.slice(0, 39)]);
      setProject(cloneProject(previous));
      return currentHistory.slice(0, -1);
    });
  }, [project]);

  const redo = useCallback(() => {
    setFuture((currentFuture) => {
      if (currentFuture.length === 0) return currentFuture;
      const [next, ...rest] = currentFuture;
      setHistory((currentHistory) => [...currentHistory.slice(-39), cloneProject(project)]);
      setProject(cloneProject(next));
      return rest;
    });
  }, [project]);

  const setProjectName = useCallback((name: string) => {
    applyProject((current) => ({ ...current, name }), false);
  }, [applyProject]);

  const loadProject = useCallback((nextProject: StudioProject) => {
    setProject(cloneProject(nextProject));
    setSelection({ ids: [], primaryId: undefined });
    setHistory([]);
    setFuture([]);
    setTheme(nextProject.theme);
    setPromptHistory(nextProject.promptHistory ?? []);
    setGuides([]);
  }, []);

  const createNewProject = useCallback((name = 'Untitled Studio') => {
    loadProject(createDemoStudioProject(name));
  }, [loadProject]);

  const replaceProjectAssets = useCallback((src: string, name: string) => {
    addImageLayer({ src, name });
  }, [addImageLayer]);

  return {
    project,
    selection,
    selectedLayers,
    primaryLayer,
    activeTool,
    theme,
    history,
    future,
    guides,
    beforeAfter,
    promptHistory,
    exportPresets,
    clipboardLayers,
    activeColor,
    secondaryColor,
    brushSettings,
    setProject,
    loadProject,
    createNewProject,
    setProjectName,
    setSelection,
    selectLayer,
    selectMany,
    clearSelection,
    deselect,
    selectAllLayers,
    selectRelativeLayer,
    setActiveTool,
    setCanvasZoom,
    setCanvasPan,
    fitCanvasToScreen,
    setCanvasTo100,
    toggleTheme,
    toggleCanvasGrid,
    toggleCanvasRulers,
    toggleCanvasGuides,
    toggleCanvasSnap,
    toggleCanvasTransparent,
    setCanvasBackgroundColor,
    rotateCanvas,
    cropCanvasToRect,
    setProjectPreset,
    setCustomCanvasSize,
    updateLayer,
    updateSelectedLayers,
    addTextLayer,
    addShapeLayer,
    addGradientLayer,
    addAdjustmentLayer,
    addGroupLayer,
    addImageLayer,
    replaceProjectAssets,
    duplicateSelection,
    deleteSelection,
    copySelection,
    cutSelection,
    pasteClipboard,
    reorderLayer,
    moveSelectionStack,
    moveSelectionBy,
    resizePrimaryLayer,
    rotatePrimaryLayer,
    renameLayer,
    toggleLayerVisible,
    toggleLayerLocked,
    setLayerBlendMode,
    groupSelection,
    ungroupSelection,
    mergeSelectedLayers,
    mergeVisibleLayers,
    flattenImage,
    toggleLayerMask,
    applyLayerMask,
    invertLayerMask,
    toggleClippingMask,
    convertSelectionToSmartObject,
    alignSelection,
    distributeSelection,
    autoEnhancePrimary,
    autoColorPrimary,
    autoContrastPrimary,
    applyTextPreset,
    pickColorFromLayer,
    setPrimaryLayerColor,
    setActiveColor,
    setSecondaryColor,
    setBrushSettings,
    applyToolAt,
    runAiAction,
    undo,
    redo,
    setGuides,
    setBeforeAfter
  };
}
