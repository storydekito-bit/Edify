export type StudioTheme = 'dark' | 'light';

export type StudioToolId =
  | 'move'
  | 'select'
  | 'transform'
  | 'marquee'
  | 'lasso'
  | 'magic-wand'
  | 'crop'
  | 'perspective-crop'
  | 'canvas'
  | 'rotate'
  | 'brush'
  | 'eraser'
  | 'fill'
  | 'gradient'
  | 'text'
  | 'rectangle'
  | 'rounded-rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'polygon'
  | 'pen'
  | 'eyedropper'
  | 'clone'
  | 'healing'
  | 'red-eye'
  | 'color-replace'
  | 'blur'
  | 'sharpen'
  | 'smudge'
  | 'dodge-burn'
  | 'hand'
  | 'zoom';

export type StudioLayerKind = 'image' | 'text' | 'shape' | 'adjustment' | 'group' | 'ai';

export type StudioBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'darken'
  | 'lighten';

export type StudioShapeKind =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'polygon';

export type StudioExportFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'pdf';

export type StudioPresetSize =
  | 'youtube-thumb'
  | 'discord-banner'
  | 'roblox-icon'
  | 'roblox-thumb'
  | 'instagram-post'
  | 'tiktok-cover'
  | 'custom';

export type StudioPoint = {
  x: number;
  y: number;
};

export type StudioRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StudioFilterSettings = {
  gaussianBlur: number;
  motionBlur: number;
  radialBlur: number;
  lensBlur: number;
  pixelate: number;
  noise: number;
  sharpen: number;
  edgeDetect: number;
  glow: number;
  bloom: number;
  dropShadow: number;
  innerShadow: number;
  stroke: number;
  outline: number;
  bevel: number;
  emboss: number;
  backgroundBlur: number;
  duotone: number;
  vintage: number;
  cinematic: number;
  robloxGlow: number;
  youtubeEnhance: number;
};

export type StudioAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  exposure: number;
  gamma: number;
  temperature: number;
  tint: number;
  vibrance: number;
  highlights: number;
  shadows: number;
  clarity: number;
  dehaze: number;
  grain: number;
  vignette: number;
  blackAndWhite: number;
  invert: number;
  posterize: number;
  threshold: number;
  curvesLift: number;
  curvesMid: number;
  curvesGain: number;
  levelsBlack: number;
  levelsWhite: number;
  levelsGamma: number;
  colorBalanceRed: number;
  colorBalanceGreen: number;
  colorBalanceBlue: number;
  selectiveColor: number;
};

export type StudioTextStylePreset =
  | 'apple-clean'
  | 'netflix'
  | 'roblox'
  | 'neon'
  | 'luxury'
  | 'cyber'
  | 'glass';

export type StudioBaseLayer = {
  id: string;
  name: string;
  kind: StudioLayerKind;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: StudioBlendMode;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  skewX?: number;
  skewY?: number;
  filters: StudioFilterSettings;
  adjustments: StudioAdjustments;
  maskEnabled?: boolean;
  maskApplied?: boolean;
  maskInverted?: boolean;
  clippingMask?: boolean;
  smartObject?: boolean;
  premium?: boolean;
  parentId?: string | null;
};

export type StudioImageLayer = StudioBaseLayer & {
  kind: 'image' | 'ai';
  src: string;
  fit: 'cover' | 'contain';
  flipX?: boolean;
  flipY?: boolean;
};

export type StudioTextLayer = StudioBaseLayer & {
  kind: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  color: string;
  gradientText?: boolean;
  gradientStart?: string;
  gradientEnd?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  glowColor?: string;
  glowStrength?: number;
  letterSpacing: number;
  lineHeight: number;
  curvedText?: number;
  stylePreset?: StudioTextStylePreset;
};

export type StudioShapeLayer = StudioBaseLayer & {
  kind: 'shape';
  shape: StudioShapeKind;
  fill: string;
  strokeColor: string;
  strokeWidth: number;
  radius?: number;
  points?: StudioPoint[];
};

export type StudioAdjustmentLayer = StudioBaseLayer & {
  kind: 'adjustment';
  target: 'all-below' | 'selection';
  label: string;
};

export type StudioGroupLayer = StudioBaseLayer & {
  kind: 'group';
  expanded: boolean;
};

export type StudioLayer =
  | StudioImageLayer
  | StudioTextLayer
  | StudioShapeLayer
  | StudioAdjustmentLayer
  | StudioGroupLayer;

export type StudioProjectAsset = {
  id: string;
  name: string;
  src: string;
  kind: 'image' | 'svg' | 'texture' | 'reference';
  width?: number;
  height?: number;
  importedAt: string;
};

export type StudioAiHistoryEntry = {
  id: string;
  action:
    | 'generative-fill'
    | 'generative-remove'
    | 'background-remover'
    | 'object-select'
    | 'subject-select'
    | 'smart-erase'
    | 'expand-canvas'
    | 'replace-background'
    | 'upscale'
    | 'face-enhance'
    | 'separate-layers';
  prompt: string;
  createdAt: string;
  resultLayerId?: string;
};

export type StudioExportPreset = {
  id: StudioPresetSize;
  label: string;
  width: number;
  height: number;
};

export type StudioProject = {
  id: string;
  kind: 'studio';
  version: 1;
  name: string;
  path?: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  theme: StudioTheme;
  canvas: {
    width: number;
    height: number;
    background: string;
    transparent: boolean;
    zoom: number;
    panX: number;
    panY: number;
    rotation: number;
    showGrid: boolean;
    showRulers: boolean;
    showGuides: boolean;
    snap: boolean;
  };
  assets: StudioProjectAsset[];
  layers: StudioLayer[];
  promptHistory: StudioAiHistoryEntry[];
  notes?: string;
};

export type StudioProjectSummary = {
  id: string;
  name: string;
  path: string;
  updatedAt: string;
  thumbnail?: string;
};

export type StudioBootstrap = {
  recentProjects: StudioProjectSummary[];
  accountUser?: {
    id: string;
    name: string;
    email: string;
    provider: 'google' | 'github' | 'microsoft';
  } | null;
};

export type StudioSelectionInfo = {
  ids: string[];
  primaryId?: string;
};

export type StudioGuide = {
  type: 'vertical' | 'horizontal';
  value: number;
};

export type StudioPremiumFeature =
  | 'ai-tools'
  | 'advanced-layers'
  | 'high-res-export'
  | 'cloud-save'
  | 'premium-filters'
  | 'advanced-workspace';
