import type {
  StudioAdjustments,
  StudioFilterSettings,
  StudioImageLayer,
  StudioLayer,
  StudioProject,
  StudioShapeLayer,
  StudioTextLayer
} from '../types/studio';

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function baseFilters(): StudioFilterSettings {
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
    youtubeEnhance: 0
  };
}

function baseAdjustments(): StudioAdjustments {
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
    selectiveColor: 0
  };
}

function createBaseLayer(partial: Partial<StudioLayer> & { id: string; name: string; kind: StudioLayer['kind']; x: number; y: number; width: number; height: number }): StudioLayer {
  return {
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    rotation: 0,
    filters: baseFilters(),
    adjustments: baseAdjustments(),
    ...partial
  } as StudioLayer;
}

export function createDemoStudioProject(seedName = 'Thumbnail Studio Demo'): StudioProject {
  const gradientLayer: StudioShapeLayer = {
    ...(createBaseLayer({
      id: createId('shape'),
      kind: 'shape',
      name: 'Hero backplate',
      x: 120,
      y: 100,
      width: 1040,
      height: 520
    }) as StudioShapeLayer),
    shape: 'rounded-rectangle',
    fill: '#11141d',
    strokeColor: '#2f83ff',
    strokeWidth: 2,
    radius: 32,
    filters: {
      ...baseFilters(),
      glow: 18,
      youtubeEnhance: 12
    }
  };

  const accentShape: StudioShapeLayer = {
    ...(createBaseLayer({
      id: createId('shape'),
      kind: 'shape',
      name: 'Accent circle',
      x: 944,
      y: 72,
      width: 190,
      height: 190
    }) as StudioShapeLayer),
    shape: 'ellipse',
    fill: '#8768ff',
    strokeColor: '#8768ff',
    strokeWidth: 0,
    opacity: 0.68
  };

  const headline: StudioTextLayer = {
    ...(createBaseLayer({
      id: createId('text'),
      kind: 'text',
      name: 'Headline',
      x: 186,
      y: 490,
      width: 720,
      height: 140
    }) as StudioTextLayer),
    text: 'THUMBNAIL STUDIO',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    fontSize: 88,
    fontWeight: 900,
    italic: false,
    underline: false,
    align: 'left',
    color: '#f7fbff',
    gradientText: true,
    gradientStart: '#f7fbff',
    gradientEnd: '#9ae7ff',
    shadowColor: '#0a0f18',
    shadowBlur: 22,
    glowColor: '#42e8ff',
    glowStrength: 24,
    letterSpacing: 0,
    lineHeight: 1,
    stylePreset: 'neon',
    filters: {
      ...baseFilters(),
      glow: 30
    }
  };

  const subtitle: StudioTextLayer = {
    ...(createBaseLayer({
      id: createId('text'),
      kind: 'text',
      name: 'Subtitle',
      x: 190,
      y: 594,
      width: 620,
      height: 64
    }) as StudioTextLayer),
    text: 'Drag layers, shape titles, add filters, and export clean thumbnails.',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    fontSize: 28,
    fontWeight: 650,
    italic: false,
    underline: false,
    align: 'left',
    color: '#d4ddf5',
    letterSpacing: 0,
    lineHeight: 1.25
  };

  const heroImage: StudioImageLayer = {
    ...(createBaseLayer({
      id: createId('image'),
      kind: 'image',
      name: 'Imported frame',
      x: 200,
      y: 156,
      width: 780,
      height: 300
    }) as StudioImageLayer),
    src:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0a1120"/>
              <stop offset="65%" stop-color="#182d65"/>
              <stop offset="100%" stop-color="#36295b"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="720" fill="url(#bg)"/>
          <rect x="130" y="154" width="190" height="268" rx="18" fill="#163687" opacity=".9"/>
          <rect x="470" y="122" width="240" height="320" rx="22" fill="#165a78" opacity=".95"/>
          <circle cx="890" cy="180" r="110" fill="#5f48bf" opacity=".9"/>
          <path d="M250 570 L520 310 H640 L920 570" fill="none" stroke="#2f83ff" stroke-width="12"/>
          <path d="M410 570 L560 312 H600 L740 570" fill="none" stroke="#8f6bff" stroke-width="4"/>
          <rect x="72" y="606" width="1056" height="6" fill="#35dbff" opacity=".85"/>
        </svg>
      `),
    fit: 'cover'
  };

  const layers: StudioLayer[] = [gradientLayer, heroImage, accentShape, headline, subtitle];

  return {
    id: createId('studio-project'),
    kind: 'studio',
    version: 1,
    name: seedName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    theme: 'dark',
    canvas: {
      width: 1280,
      height: 720,
      background: '#0a0d12',
      transparent: false,
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      showGrid: true,
      showRulers: true,
      showGuides: true,
      snap: true
    },
    assets: [],
    layers,
    promptHistory: [],
    notes: 'Demo project seeded by Thumbnail Studio.'
  };
}
