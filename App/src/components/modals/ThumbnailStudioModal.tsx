import {
  Brush,
  CircleDot,
  Crown,
  Download,
  Grid2x2,
  History,
  ImageIcon,
  LayoutTemplate,
  Layers3,
  Lock,
  Move,
  MousePointer2,
  SlidersHorizontal,
  Sparkles,
  Type,
  Wand2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { edifyApi } from '../../lib/bridge';
import { hasThumbnailStudioAccess, loadPremiumAccess, type PremiumAccess } from '../../lib/premium';
import { PremiumOfferModal } from './PremiumOfferModal';
import { ThumbnailPromoModal } from './ThumbnailPromoModal';
import type { DesktopAccountUser, MediaAsset, ProjectDocument, Toast } from '../../types/edify';

type ThumbnailStudioModalProps = {
  project: ProjectDocument;
  onClose: () => void;
  onImportMedia?: () => void;
  accountUser?: DesktopAccountUser | null;
  onOpenAccount?: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

type ThumbPreset = 'creator' | 'gaming' | 'cinema' | 'clean';
type ThumbRatio = '16:9' | '1:1' | '4:5';
type StudioMode = 'basic' | 'pro';
type ActiveLayer = 'image' | 'title' | 'subtitle' | 'ribbon' | 'sticker';
type StickerStyle = 'none' | 'arrow' | 'circle' | 'burst';

const presetMeta: Record<ThumbPreset, {
  label: string;
  titleColor: string;
  accent: string;
  panel: string;
  stroke: string;
  gradient: [string, string];
}> = {
  creator: {
    label: 'Creator Drop',
    titleColor: '#f8fbff',
    accent: '#42e8ff',
    panel: 'rgba(8, 14, 26, 0.82)',
    stroke: 'rgba(66, 232, 255, 0.62)',
    gradient: ['#143b7a', '#4e34b8']
  },
  gaming: {
    label: 'Gaming Shock',
    titleColor: '#ffffff',
    accent: '#ff466f',
    panel: 'rgba(18, 9, 17, 0.84)',
    stroke: 'rgba(255, 70, 111, 0.6)',
    gradient: ['#160c1b', '#6c1736']
  },
  cinema: {
    label: 'Cinema Poster',
    titleColor: '#fff8ea',
    accent: '#ffd166',
    panel: 'rgba(17, 13, 8, 0.84)',
    stroke: 'rgba(255, 209, 102, 0.52)',
    gradient: ['#19110b', '#45311c']
  },
  clean: {
    label: 'Clean Review',
    titleColor: '#f5fbff',
    accent: '#8fc4ff',
    panel: 'rgba(12, 16, 24, 0.84)',
    stroke: 'rgba(143, 196, 255, 0.42)',
    gradient: ['#142033', '#25496f']
  }
};

const ratioMeta: Record<ThumbRatio, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 }
};

function drawCover(
  context: CanvasRenderingContext2D,
  media: CanvasImageSource,
  width: number,
  height: number,
  naturalWidth: number,
  naturalHeight: number,
  scaleBoost = 1,
  offsetX = 0,
  offsetY = 0
) {
  const scale = Math.max(width / Math.max(1, naturalWidth), height / Math.max(1, naturalHeight)) * scaleBoost;
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  const x = (width - drawWidth) / 2 + offsetX;
  const y = (height - drawHeight) / 2 + offsetY;
  context.drawImage(media, x, y, drawWidth, drawHeight);
}

async function loadPreviewMedia(asset?: MediaAsset | null) {
  if (!asset?.previewUrl && !asset?.thumbnailUrl) {
    return null;
  }
  const source = asset.previewUrl ?? asset.thumbnailUrl;
  if (!source) return null;

  if (asset.kind === 'video') {
    return new Promise<HTMLVideoElement | null>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      let done = false;
      const finish = (result: HTMLVideoElement | null) => {
        if (done) return;
        done = true;
        resolve(result);
      };
      video.onloadeddata = () => {
        const target = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(1, video.duration / 3) : 0;
        try {
          video.currentTime = target;
        } catch {
          finish(video);
        }
      };
      video.onseeked = () => finish(video);
      video.onerror = () => finish(null);
      window.setTimeout(() => finish(video), 1800);
      video.src = source;
    });
  }

  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ThumbnailStudioModal({
  project,
  onClose,
  onImportMedia,
  accountUser = null,
  onOpenAccount,
  pushToast
}: ThumbnailStudioModalProps) {
  const visualAssets = useMemo(
    () => project.assets.filter((asset) => asset.kind === 'image' || asset.kind === 'video'),
    [project.assets]
  );
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess>(() => loadPremiumAccess());
  const proUnlocked = hasThumbnailStudioAccess(premiumAccess);

  const [selectedAssetId, setSelectedAssetId] = useState<string>(visualAssets[0]?.id ?? '');
  const [backgroundAssetId, setBackgroundAssetId] = useState<string>('');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string>('');
  const [preset, setPreset] = useState<ThumbPreset>('creator');
  const [ratio, setRatio] = useState<ThumbRatio>('16:9');
  const [studioMode, setStudioMode] = useState<StudioMode>('basic');
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>('image');
  const [title, setTitle] = useState(project.name.toUpperCase());
  const [subtitle, setSubtitle] = useState('NEW VIDEO OUT NOW');
  const [ribbonText, setRibbonText] = useState('LIMITED DROP');
  const [showRibbon, setShowRibbon] = useState(true);
  const [showGlow, setShowGlow] = useState(true);
  const [showBackdropBlur, setShowBackdropBlur] = useState(true);
  const [showTitlePlate, setShowTitlePlate] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [mediaElement, setMediaElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [backgroundElement, setBackgroundElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [imageScale, setImageScale] = useState(1.04);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [backgroundScale, setBackgroundScale] = useState(1);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.42);
  const [backgroundBlur, setBackgroundBlur] = useState(12);
  const [imageBrightness, setImageBrightness] = useState(1);
  const [imageContrast, setImageContrast] = useState(1);
  const [imageSaturation, setImageSaturation] = useState(1);
  const [vignetteStrength, setVignetteStrength] = useState(0.38);
  const [titlePosition, setTitlePosition] = useState({ x: 0.095, y: 0.705 });
  const [subtitlePosition, setSubtitlePosition] = useState({ x: 0.098, y: 0.84 });
  const [ribbonPosition, setRibbonPosition] = useState({ x: 0.2, y: 0.11 });
  const [titleScale, setTitleScale] = useState(1);
  const [subtitleScale, setSubtitleScale] = useState(1);
  const [titleRotation, setTitleRotation] = useState(0);
  const [panelOpacity, setPanelOpacity] = useState(0.82);
  const [ribbonScale, setRibbonScale] = useState(1);
  const [stickerStyle, setStickerStyle] = useState<StickerStyle>('none');
  const [stickerPosition, setStickerPosition] = useState({ x: 0.78, y: 0.32 });
  const [stickerScale, setStickerScale] = useState(1);
  const [showPromoUnlock, setShowPromoUnlock] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<{
    layer: ActiveLayer;
    startX: number;
    startY: number;
    startState: {
      imageOffset: { x: number; y: number };
      titlePosition: { x: number; y: number };
      subtitlePosition: { x: number; y: number };
      ribbonPosition: { x: number; y: number };
      stickerPosition: { x: number; y: number };
    };
  } | null>(null);

  const selectedAsset = visualAssets.find((asset) => asset.id === selectedAssetId) ?? visualAssets[0] ?? null;
  const backgroundAsset = visualAssets.find((asset) => asset.id === backgroundAssetId) ?? null;
  const presetInfo = presetMeta[preset];
  const ratioInfo = ratioMeta[ratio];
  const isProMode = studioMode === 'pro' && proUnlocked;
  const isAdvancedWorkspace = false;
  const layerItems: Array<{ id: ActiveLayer; label: string; meta: string; visible: boolean }> = [
    { id: 'image', label: selectedAsset?.name || 'Source frame', meta: 'Main visual', visible: !!mediaElement || !!selectedAsset },
    { id: 'title', label: 'Headline', meta: title || 'Main hook', visible: true },
    { id: 'subtitle', label: 'Subtitle', meta: subtitle || 'Secondary line', visible: true },
    { id: 'ribbon', label: 'Promo ribbon', meta: ribbonText || 'Ribbon copy', visible: showRibbon },
    { id: 'sticker', label: 'Focus sticker', meta: stickerStyle === 'none' ? 'Hidden' : stickerStyle, visible: stickerStyle !== 'none' }
  ];
  const historyItems = [
    `Preset: ${presetInfo.label}`,
    `${ratio} canvas`,
    backgroundAssetId || customBackgroundUrl ? 'Backdrop loaded' : 'Gradient backdrop',
    showGlow ? 'Glow enabled' : 'Glow muted',
    isProMode ? 'Pro workspace' : 'Free workspace'
  ];

  useEffect(() => {
    if (!selectedAssetId && visualAssets[0]) {
      setSelectedAssetId(visualAssets[0].id);
    }
  }, [selectedAssetId, visualAssets]);

  useEffect(() => {
    const refreshPremium = () => setPremiumAccess(loadPremiumAccess());
    window.addEventListener('focus', refreshPremium);
    window.addEventListener('storage', refreshPremium);
    return () => {
      window.removeEventListener('focus', refreshPremium);
      window.removeEventListener('storage', refreshPremium);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (customBackgroundUrl) {
        URL.revokeObjectURL(customBackgroundUrl);
      }
    };
  }, [customBackgroundUrl]);

  useEffect(() => {
    let active = true;
    void loadPreviewMedia(selectedAsset).then((element) => {
      if (active) setMediaElement(element);
    });
    return () => {
      active = false;
    };
  }, [selectedAsset]);

  useEffect(() => {
    let active = true;
    if (customBackgroundUrl) {
      void loadPreviewMedia({
        id: 'custom-background',
        name: 'Custom background',
        kind: 'image',
        path: customBackgroundUrl,
        previewUrl: customBackgroundUrl,
        importedAt: new Date().toISOString()
      }).then((element) => {
        if (active) setBackgroundElement(element);
      });
      return () => {
        active = false;
      };
    }
    void loadPreviewMedia(backgroundAsset).then((element) => {
      if (active) setBackgroundElement(element);
    });
    return () => {
      active = false;
    };
  }, [backgroundAsset, customBackgroundUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = ratioInfo.width;
    canvas.height = ratioInfo.height;
    const context = canvas.getContext('2d');
    if (!context) return;

    const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, '#05060a');
    background.addColorStop(0.45, presetInfo.gradient[0]);
    background.addColorStop(1, presetInfo.gradient[1]);
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (backgroundElement) {
      const naturalWidth = backgroundElement instanceof HTMLVideoElement ? backgroundElement.videoWidth || canvas.width : backgroundElement.naturalWidth || canvas.width;
      const naturalHeight = backgroundElement instanceof HTMLVideoElement ? backgroundElement.videoHeight || canvas.height : backgroundElement.naturalHeight || canvas.height;
      context.save();
      context.globalAlpha = backgroundOpacity;
      context.filter = `blur(${backgroundBlur}px) brightness(0.82) saturate(0.9)`;
      drawCover(context, backgroundElement, canvas.width, canvas.height, naturalWidth, naturalHeight, backgroundScale);
      context.restore();
    }

    if (mediaElement) {
      const naturalWidth = mediaElement instanceof HTMLVideoElement ? mediaElement.videoWidth || canvas.width : mediaElement.naturalWidth || canvas.width;
      const naturalHeight = mediaElement instanceof HTMLVideoElement ? mediaElement.videoHeight || canvas.height : mediaElement.naturalHeight || canvas.height;
      const offsetX = imageOffset.x * canvas.width;
      const offsetY = imageOffset.y * canvas.height;
      const filter = `brightness(${imageBrightness}) contrast(${imageContrast}) saturate(${imageSaturation})`;

      if (showBackdropBlur) {
        context.save();
        context.filter = `${filter} blur(26px) brightness(${imageBrightness * 0.56})`;
        drawCover(context, mediaElement, canvas.width, canvas.height, naturalWidth, naturalHeight, imageScale, offsetX, offsetY);
        context.restore();
      }

      context.save();
      context.globalAlpha = 0.97;
      context.filter = filter;
      drawCover(context, mediaElement, canvas.width, canvas.height, naturalWidth, naturalHeight, imageScale, offsetX, offsetY);
      context.restore();
    } else {
      context.fillStyle = 'rgba(255,255,255,0.06)';
      context.fillRect(canvas.width * 0.14, canvas.height * 0.18, canvas.width * 0.26, canvas.height * 0.46);
      context.fillStyle = 'rgba(66,232,255,0.18)';
      context.fillRect(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.18, canvas.height * 0.56);
      context.fillStyle = 'rgba(159,124,255,0.2)';
      context.beginPath();
      context.arc(canvas.width * 0.78, canvas.height * 0.3, canvas.height * 0.11, 0, Math.PI * 2);
      context.fill();
    }

    const overlay = context.createLinearGradient(0, 0, 0, canvas.height);
    overlay.addColorStop(0, 'rgba(5,7,12,0.08)');
    overlay.addColorStop(0.55, 'rgba(5,7,12,0.18)');
    overlay.addColorStop(1, 'rgba(5,7,12,0.72)');
    context.fillStyle = overlay;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (vignetteStrength > 0) {
      const vignette = context.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.46,
        canvas.height * 0.12,
        canvas.width * 0.5,
        canvas.height * 0.52,
        canvas.width * 0.7
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, `rgba(0,0,0,${vignetteStrength})`);
      context.fillStyle = vignette;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.strokeStyle = presetInfo.stroke;
    context.lineWidth = Math.max(2, canvas.height * 0.004);
    context.strokeRect(canvas.width * 0.06, canvas.height * 0.08, canvas.width * 0.88, canvas.height * 0.84);

    if (showRibbon) {
      context.save();
      context.translate(ribbonPosition.x * canvas.width, ribbonPosition.y * canvas.height);
      context.rotate(-0.08);
      context.scale(ribbonScale, ribbonScale);
      context.fillStyle = '#ff334f';
      context.fillRect(0, 0, canvas.width * 0.26, canvas.height * 0.085);
      context.fillStyle = '#ffffff';
      context.font = `800 ${Math.max(20, Math.round(canvas.height * 0.028))}px Inter, Segoe UI, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(ribbonText, canvas.width * 0.13, canvas.height * 0.042, canvas.width * 0.22);
      context.restore();
    }

    if (showTitlePlate) {
      context.fillStyle = presetInfo.panel.replace(/0\.\d+\)/, `${panelOpacity})`);
      context.fillRect(canvas.width * 0.06, canvas.height * 0.67, canvas.width * 0.74, canvas.height * 0.2);
    }

    context.save();
    context.translate(titlePosition.x * canvas.width, titlePosition.y * canvas.height);
    context.rotate((titleRotation * Math.PI) / 180);
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillStyle = presetInfo.titleColor;
    context.font = `900 ${Math.max(40, Math.round(canvas.height * 0.09 * titleScale))}px Inter, Segoe UI, sans-serif`;
    context.shadowColor = showGlow ? `${presetInfo.accent}cc` : 'transparent';
    context.shadowBlur = showGlow ? 22 : 0;
    context.fillText(title, 0, 0, canvas.width * 0.68);
    context.restore();

    context.shadowBlur = 0;
    context.fillStyle = '#dfe8ff';
    context.font = `700 ${Math.max(18, Math.round(canvas.height * 0.028 * subtitleScale))}px Inter, Segoe UI, sans-serif`;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(subtitle, subtitlePosition.x * canvas.width, subtitlePosition.y * canvas.height, canvas.width * 0.64);

    context.fillStyle = 'rgba(5,7,12,0.78)';
    context.fillRect(canvas.width * 0.77, canvas.height * 0.705, canvas.width * 0.15, canvas.height * 0.082);
    context.strokeStyle = `${presetInfo.accent}cc`;
    context.strokeRect(canvas.width * 0.77, canvas.height * 0.705, canvas.width * 0.15, canvas.height * 0.082);
    context.fillStyle = presetInfo.accent;
    context.font = `800 ${Math.max(18, Math.round(canvas.height * 0.03))}px Inter, Segoe UI, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(presetInfo.label, canvas.width * 0.845, canvas.height * 0.746, canvas.width * 0.13);

    if (stickerStyle !== 'none') {
      const centerX = stickerPosition.x * canvas.width;
      const centerY = stickerPosition.y * canvas.height;
      const base = canvas.height * 0.08 * stickerScale;
      context.save();
      context.strokeStyle = presetInfo.accent;
      context.fillStyle = `${presetInfo.accent}22`;
      context.lineWidth = Math.max(4, canvas.height * 0.006);
      context.shadowColor = `${presetInfo.accent}aa`;
      context.shadowBlur = 18;
      if (stickerStyle === 'circle') {
        context.beginPath();
        context.arc(centerX, centerY, base, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      } else if (stickerStyle === 'arrow') {
        context.beginPath();
        context.moveTo(centerX - base * 1.1, centerY - base * 0.25);
        context.lineTo(centerX + base * 0.7, centerY - base * 0.25);
        context.lineTo(centerX + base * 0.7, centerY - base * 0.75);
        context.lineTo(centerX + base * 1.55, centerY);
        context.lineTo(centerX + base * 0.7, centerY + base * 0.75);
        context.lineTo(centerX + base * 0.7, centerY + base * 0.25);
        context.lineTo(centerX - base * 1.1, centerY + base * 0.25);
        context.closePath();
        context.fill();
        context.stroke();
      } else if (stickerStyle === 'burst') {
        for (let index = 0; index < 10; index += 1) {
          const angle = (Math.PI * 2 * index) / 10;
          const inner = base * 0.45;
          const outer = base * 1.18;
          context.beginPath();
          context.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
          context.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
          context.stroke();
        }
        context.beginPath();
        context.arc(centerX, centerY, base * 0.52, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
  }, [
    imageBrightness,
    imageContrast,
    imageOffset.x,
    imageOffset.y,
    imageSaturation,
    imageScale,
    mediaElement,
    panelOpacity,
    presetInfo,
    ratioInfo,
    ribbonPosition.x,
    ribbonPosition.y,
    ribbonScale,
    ribbonText,
    backgroundBlur,
    backgroundElement,
    backgroundOpacity,
    backgroundScale,
    showBackdropBlur,
    showGlow,
    showRibbon,
    showTitlePlate,
    subtitle,
    subtitlePosition.x,
    subtitlePosition.y,
    subtitleScale,
    stickerPosition.x,
    stickerPosition.y,
    stickerScale,
    stickerStyle,
    title,
    titlePosition.x,
    titlePosition.y,
    titleRotation,
    titleScale,
    vignetteStrength
  ]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current || !stageRef.current || !canvasRef.current || !isProMode) return;
      const rect = stageRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / Math.max(1, rect.width);
      const scaleY = canvasRef.current.height / Math.max(1, rect.height);
      const deltaX = (event.clientX - dragRef.current.startX) * scaleX;
      const deltaY = (event.clientY - dragRef.current.startY) * scaleY;
      const deltaXRatio = deltaX / canvasRef.current.width;
      const deltaYRatio = deltaY / canvasRef.current.height;

      if (dragRef.current.layer === 'image') {
        setImageOffset({
          x: clamp(dragRef.current.startState.imageOffset.x + deltaXRatio, -0.35, 0.35),
          y: clamp(dragRef.current.startState.imageOffset.y + deltaYRatio, -0.35, 0.35)
        });
      } else if (dragRef.current.layer === 'title') {
        setTitlePosition({
          x: clamp(dragRef.current.startState.titlePosition.x + deltaXRatio, 0.04, 0.82),
          y: clamp(dragRef.current.startState.titlePosition.y + deltaYRatio, 0.08, 0.9)
        });
      } else if (dragRef.current.layer === 'subtitle') {
        setSubtitlePosition({
          x: clamp(dragRef.current.startState.subtitlePosition.x + deltaXRatio, 0.04, 0.82),
          y: clamp(dragRef.current.startState.subtitlePosition.y + deltaYRatio, 0.08, 0.94)
        });
      } else if (dragRef.current.layer === 'ribbon') {
        setRibbonPosition({
          x: clamp(dragRef.current.startState.ribbonPosition.x + deltaXRatio, 0.04, 0.68),
          y: clamp(dragRef.current.startState.ribbonPosition.y + deltaYRatio, 0.03, 0.45)
        });
      } else {
        setStickerPosition({
          x: clamp(dragRef.current.startState.stickerPosition.x + deltaXRatio, 0.08, 0.9),
          y: clamp(dragRef.current.startState.stickerPosition.y + deltaYRatio, 0.08, 0.85)
        });
      }
    };

    const onPointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isProMode]);

  const openPremiumPrompt = () => {
    pushToast({
      title: 'Thumbnail Pro is VIP',
      detail: 'Unlock the premium pack to get free transform, text placement, and creator-grade PNG cover controls.',
      tone: 'info'
    });
    setShowPlanModal(true);
  };

  const handleModeSelect = (mode: StudioMode) => {
    if (mode === 'pro' && !proUnlocked) {
      openPremiumPrompt();
      return;
    }
    setStudioMode(mode);
  };

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Edify could not create the PNG preview.');
      const buffer = await blob.arrayBuffer();
      const result = await edifyApi.saveThumbnailPng({
        fileName: `${project.name} Thumbnail.png`,
        buffer
      });
      if (!result?.canceled) {
        pushToast({
          title: 'Thumbnail exported',
          detail: result.filePath || 'PNG saved from Thumbnail Studio.',
          tone: 'success'
        });
      }
    } catch (error) {
      pushToast({
        title: 'Thumbnail export failed',
        detail: error instanceof Error ? error.message : 'Edify could not export this PNG.',
        tone: 'warning'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const stageCursor = isProMode ? (activeLayer === 'image' ? 'grab' : 'move') : 'default';

  return (
    <div className="modal-scrim">
      <section className="modal thumbnail-studio-modal">
        <header className="modal-header">
          <div>
            <h2>Thumbnail Studio</h2>
            <p>Keep the free preset workflow for fast covers, or unlock Thumbnail Pro for a richer creator canvas with manual transform and cleaner PNG hooks.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close thumbnail studio">
            <X size={16} />
          </button>
        </header>

        <div className="thumbnail-studio-layout">
          <aside className="thumbnail-studio-sidebar">
            <div className="thumbnail-section">
              <span className="thumbnail-section-kicker"><Crown size={14} /> Studio mode</span>
              <div className="thumbnail-mode-row">
                <button
                  type="button"
                  className={`thumbnail-mode-card ${studioMode === 'basic' ? 'active' : ''}`}
                  onClick={() => handleModeSelect('basic')}
                >
                  <strong>Free Presets</strong>
                  <small>Fast creator cards, red ribbon, and clean PNG export.</small>
                </button>
                <button
                  type="button"
                  className={`thumbnail-mode-card ${studioMode === 'pro' ? 'active' : ''} ${!proUnlocked ? 'locked' : ''}`}
                  onClick={() => handleModeSelect('pro')}
                >
                  <strong>{proUnlocked ? 'Thumbnail Pro' : 'Thumbnail Pro VIP'}</strong>
                  <small>Free transform, manual placement, and color tuning like a cover design tool.</small>
                  {!proUnlocked && <span className="thumbnail-lock-badge"><Lock size={12} /> VIP</span>}
                </button>
              </div>
            </div>

            <div className="thumbnail-section">
              <span className="thumbnail-section-kicker"><LayoutTemplate size={14} /> Style preset</span>
              <div className="thumbnail-chip-row">
                {Object.entries(presetMeta).map(([id, meta]) => (
                  <button
                    key={id}
                    type="button"
                    className={`thumbnail-chip ${preset === id ? 'active' : ''}`}
                    onClick={() => setPreset(id as ThumbPreset)}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="thumbnail-section">
              <span className="thumbnail-section-kicker"><ImageIcon size={14} /> Source frame</span>
              <div className="thumbnail-asset-list">
                {visualAssets.length === 0 ? (
                  <div className="thumbnail-empty">
                    <strong>No image or video loaded yet</strong>
                    <span>Import a visual asset, then come back here to design the PNG cover.</span>
                    {onImportMedia && <button className="secondary-button" type="button" onClick={onImportMedia}>Import visual</button>}
                  </div>
                ) : (
                  visualAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className={`thumbnail-asset-card ${selectedAsset?.id === asset.id ? 'active' : ''}`}
                      onClick={() => setSelectedAssetId(asset.id)}
                    >
                      <strong>{asset.name}</strong>
                      <small>{asset.kind.toUpperCase()}</small>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="thumbnail-section">
              <span className="thumbnail-section-kicker"><ImageIcon size={14} /> Background image</span>
              <label className="field full">
                <span>Backdrop layer</span>
                <select value={backgroundAssetId} onChange={(event) => setBackgroundAssetId(event.target.value)}>
                  <option value="">Gradient only</option>
                  {visualAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                  ))}
                </select>
              </label>
              <div className="thumbnail-chip-row">
                  <button type="button" className={`thumbnail-chip ${backgroundAssetId === '' ? 'active' : ''}`} onClick={() => setBackgroundAssetId('')}>
                    No background image
                  </button>
                  <button type="button" className={`thumbnail-chip ${customBackgroundUrl ? 'active' : ''}`} onClick={() => backgroundInputRef.current?.click()}>
                    Load local background
                  </button>
                  {selectedAsset && (
                    <button type="button" className={`thumbnail-chip ${backgroundAssetId === selectedAsset.id ? 'active' : ''}`} onClick={() => setBackgroundAssetId(selectedAsset.id)}>
                      Use current frame
                    </button>
                  )}
                </div>
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const nextUrl = URL.createObjectURL(file);
                  setCustomBackgroundUrl((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return nextUrl;
                  });
                  setBackgroundAssetId('');
                }}
              />
              {(backgroundAssetId || customBackgroundUrl) && (
                <>
                  <div className="thumbnail-chip-row">
                    {customBackgroundUrl && (
                      <button type="button" className="thumbnail-chip" onClick={() => {
                        URL.revokeObjectURL(customBackgroundUrl);
                        setCustomBackgroundUrl('');
                      }}>
                        Remove local backdrop
                      </button>
                    )}
                  </div>
                  <label className="thumbnail-range-field"><span>Backdrop scale</span><input type="range" min="1" max="1.7" step="0.01" value={backgroundScale} onChange={(event) => setBackgroundScale(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Backdrop opacity</span><input type="range" min="0.08" max="0.8" step="0.01" value={backgroundOpacity} onChange={(event) => setBackgroundOpacity(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Backdrop blur</span><input type="range" min="0" max="26" step="1" value={backgroundBlur} onChange={(event) => setBackgroundBlur(Number(event.target.value))} /></label>
                </>
              )}
            </div>

            <div className="thumbnail-section">
              <span className="thumbnail-section-kicker"><Type size={14} /> Copy</span>
              <label className="field full">
                <span>Title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="field full">
                <span>Subtitle</span>
                <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
              </label>
              <label className="field full">
                <span>Red ribbon</span>
                <input value={ribbonText} onChange={(event) => setRibbonText(event.target.value)} />
              </label>
            </div>

            <div className="thumbnail-section">
              <span className="thumbnail-section-kicker"><Sparkles size={14} /> Layout</span>
              <div className="thumbnail-chip-row">
                {Object.keys(ratioMeta).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`thumbnail-chip ${ratio === item ? 'active' : ''}`}
                    onClick={() => setRatio(item as ThumbRatio)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="thumbnail-toggle-list">
                <label><input type="checkbox" checked={showRibbon} onChange={(event) => setShowRibbon(event.target.checked)} /> Red ribbon</label>
                <label><input type="checkbox" checked={showGlow} onChange={(event) => setShowGlow(event.target.checked)} /> Glow title</label>
                <label><input type="checkbox" checked={showBackdropBlur} onChange={(event) => setShowBackdropBlur(event.target.checked)} /> Blur backdrop</label>
                <label><input type="checkbox" checked={showTitlePlate} onChange={(event) => setShowTitlePlate(event.target.checked)} /> Title plate</label>
              </div>
            </div>

            {isProMode ? (
              <>
                <div className="thumbnail-section">
                  <span className="thumbnail-section-kicker"><Move size={14} /> Pro transform</span>
                  <div className="thumbnail-chip-row">
                    {(['image', 'title', 'subtitle', 'ribbon', 'sticker'] as ActiveLayer[]).map((layer) => (
                      <button
                        key={layer}
                        type="button"
                        className={`thumbnail-chip ${activeLayer === layer ? 'active' : ''}`}
                        onClick={() => setActiveLayer(layer)}
                      >
                        {layer}
                      </button>
                    ))}
                  </div>
                  <span className="thumbnail-pro-tip">Drag the selected layer directly in the preview to place it like a real cover editor.</span>
                </div>

                <div className="thumbnail-section">
                  <span className="thumbnail-section-kicker"><Sparkles size={14} /> Focus sticker</span>
                  <div className="thumbnail-chip-row">
                    {(['none', 'arrow', 'circle', 'burst'] as StickerStyle[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`thumbnail-chip ${stickerStyle === item ? 'active' : ''}`}
                        onClick={() => setStickerStyle(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  {stickerStyle !== 'none' && (
                    <label className="thumbnail-range-field"><span>Sticker size</span><input type="range" min="0.6" max="1.8" step="0.01" value={stickerScale} onChange={(event) => setStickerScale(Number(event.target.value))} /></label>
                  )}
                </div>

                <div className="thumbnail-section">
                  <span className="thumbnail-section-kicker"><SlidersHorizontal size={14} /> Image tune</span>
                  <label className="thumbnail-range-field"><span>Zoom</span><input type="range" min="1" max="1.9" step="0.01" value={imageScale} onChange={(event) => setImageScale(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Brightness</span><input type="range" min="0.7" max="1.4" step="0.01" value={imageBrightness} onChange={(event) => setImageBrightness(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Contrast</span><input type="range" min="0.7" max="1.5" step="0.01" value={imageContrast} onChange={(event) => setImageContrast(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Saturation</span><input type="range" min="0.5" max="1.8" step="0.01" value={imageSaturation} onChange={(event) => setImageSaturation(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Vignette</span><input type="range" min="0" max="0.85" step="0.01" value={vignetteStrength} onChange={(event) => setVignetteStrength(Number(event.target.value))} /></label>
                </div>

                <div className="thumbnail-section">
                  <span className="thumbnail-section-kicker"><Wand2 size={14} /> Text and plate</span>
                  <label className="thumbnail-range-field"><span>Title size</span><input type="range" min="0.7" max="1.6" step="0.01" value={titleScale} onChange={(event) => setTitleScale(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Subtitle size</span><input type="range" min="0.8" max="1.5" step="0.01" value={subtitleScale} onChange={(event) => setSubtitleScale(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Title angle</span><input type="range" min="-20" max="20" step="1" value={titleRotation} onChange={(event) => setTitleRotation(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Plate opacity</span><input type="range" min="0.2" max="0.95" step="0.01" value={panelOpacity} onChange={(event) => setPanelOpacity(Number(event.target.value))} /></label>
                  <label className="thumbnail-range-field"><span>Ribbon size</span><input type="range" min="0.8" max="1.35" step="0.01" value={ribbonScale} onChange={(event) => setRibbonScale(Number(event.target.value))} /></label>
                </div>
              </>
            ) : (
              <div className="thumbnail-pro-lock-card">
                <strong><Lock size={15} /> Thumbnail Pro</strong>
                <span>Upgrade to unlock free transform, manual text placement, image tune sliders, and drag-to-position layers on the live canvas.</span>
                <div className="thumbnail-lock-actions">
                  <button className="primary-button" type="button" onClick={openPremiumPrompt}>
                    <Crown size={15} />
                    Unlock Thumbnail Pro
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setShowPromoUnlock(true)}>
                    <Sparkles size={15} />
                    Watch 15s unlock
                  </button>
                </div>
              </div>
            )}
          </aside>

          <div className="thumbnail-studio-main">
            {isAdvancedWorkspace ? (
              <div className="thumbnail-advanced-shell">
                <div className="thumbnail-advanced-topbar">
                  <div className="thumbnail-advanced-menu">
                    {['File', 'Edit', 'Image', 'Layer', 'Select', 'Filter', 'View', 'Window'].map((item) => (
                      <button key={item} type="button">{item}</button>
                    ))}
                  </div>
                  <div className="thumbnail-advanced-actions">
                    <span className="thumbnail-advanced-pill"><MousePointer2 size={13} /> Auto-select</span>
                    <span className="thumbnail-advanced-pill"><Grid2x2 size={13} /> Transform controls</span>
                    <span className="thumbnail-advanced-pill accent"><Sparkles size={13} /> Thumbnail Pro</span>
                  </div>
                </div>

                <div className="thumbnail-advanced-body">
                  <aside className="thumbnail-advanced-tools">
                    {[
                      { id: 'image', icon: ImageIcon, label: 'Frame' },
                      { id: 'title', icon: Type, label: 'Title' },
                      { id: 'subtitle', icon: Type, label: 'Subtitle' },
                      { id: 'ribbon', icon: Wand2, label: 'Ribbon' },
                      { id: 'sticker', icon: CircleDot, label: 'Sticker' }
                    ].map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          className={activeLayer === tool.id ? 'active' : ''}
                          onClick={() => setActiveLayer(tool.id as ActiveLayer)}
                          title={tool.label}
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                  </aside>

                  <div className="thumbnail-advanced-canvas-wrap">
                    <div className="thumbnail-preview-card advanced">
                      <div className="thumbnail-preview-top">
                        <span>Advanced thumbnail canvas</span>
                        <small>{ratioInfo.width} x {ratioInfo.height} PNG · Photoshop-style workspace</small>
                      </div>
                      <div
                        ref={stageRef}
                        className={`thumbnail-preview-stage ratio-${ratio.replace(':', '-')} ${isProMode ? 'is-pro' : ''} advanced`}
                        style={{ cursor: stageCursor }}
                        onPointerDown={(event) => {
                          if (!isProMode || !canvasRef.current) return;
                          dragRef.current = {
                            layer: activeLayer,
                            startX: event.clientX,
                            startY: event.clientY,
                            startState: {
                              imageOffset,
                              titlePosition,
                              subtitlePosition,
                              ribbonPosition,
                              stickerPosition
                            }
                          };
                        }}
                      >
                        <canvas ref={canvasRef} />
                        <div className="thumbnail-pro-overlay">
                          <span><Move size={14} /> Drag: {activeLayer}</span>
                          <small>Advanced workspace</small>
                        </div>
                      </div>
                    </div>

                    <div className="thumbnail-export-rail">
                      <article className="thumbnail-note-card">
                        <strong>Thumbnail Pro advantage</strong>
                        <div className="thumbnail-note-list">
                          <span>Free transform and direct layer placement now sit inside a denser creator workspace.</span>
                          <span>{backgroundAssetId || customBackgroundUrl ? 'Backdrop image is loaded and ready for composition.' : 'Load a local or project backdrop to build a fuller composition.'}</span>
                          <span>Use the side panels for layers, history, and quick adjustments like a mini cover editor.</span>
                        </div>
                      </article>
                      <button className="primary-button" type="button" disabled={isExporting} onClick={handleExport}>
                        <Download size={16} />
                        {isExporting ? 'Exporting PNG...' : 'Export PNG'}
                      </button>
                    </div>
                  </div>

                  <aside className="thumbnail-advanced-inspector">
                    <section className="thumbnail-advanced-panel">
                      <header><Layers3 size={14} /> Layers</header>
                      <div className="thumbnail-advanced-layer-list">
                        {layerItems.map((layer) => (
                          <button
                            key={layer.id}
                            type="button"
                            className={`thumbnail-advanced-layer ${activeLayer === layer.id ? 'active' : ''} ${layer.visible ? '' : 'muted'}`}
                            onClick={() => setActiveLayer(layer.id)}
                          >
                            <strong>{layer.label}</strong>
                            <small>{layer.meta}</small>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="thumbnail-advanced-panel">
                      <header><SlidersHorizontal size={14} /> Adjustments</header>
                      <div className="thumbnail-advanced-stats">
                        <span>Zoom <b>{Math.round(imageScale * 100)}%</b></span>
                        <span>Glow <b>{showGlow ? 'On' : 'Off'}</b></span>
                        <span>Plate <b>{Math.round(panelOpacity * 100)}%</b></span>
                        <span>Backdrop <b>{backgroundAssetId || customBackgroundUrl ? 'Loaded' : 'Gradient'}</b></span>
                      </div>
                      <div className="thumbnail-advanced-quick-grid">
                        <button type="button" onClick={() => setShowGlow((current) => !current)}>Toggle glow</button>
                        <button type="button" onClick={() => setShowTitlePlate((current) => !current)}>Toggle plate</button>
                        <button type="button" onClick={() => setShowRibbon((current) => !current)}>Toggle ribbon</button>
                        <button type="button" onClick={() => setStickerStyle(stickerStyle === 'none' ? 'circle' : 'none')}>
                          {stickerStyle === 'none' ? 'Add focus' : 'Hide focus'}
                        </button>
                      </div>
                    </section>

                    <section className="thumbnail-advanced-panel">
                      <header><History size={14} /> History</header>
                      <div className="thumbnail-advanced-history">
                        {historyItems.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </section>

                    <section className="thumbnail-advanced-panel">
                      <header><Brush size={14} /> Quick packs</header>
                      <div className="thumbnail-advanced-history">
                        <span>Hook glow headline</span>
                        <span>Gaming red burst</span>
                        <span>Cinematic gold plate</span>
                        <span>Reaction focus ring</span>
                      </div>
                    </section>
                  </aside>
                </div>
              </div>
            ) : (
              <>
                <div className="thumbnail-preview-card">
                  <div className="thumbnail-preview-top">
                    <span>Live thumbnail preview</span>
                    <small>{ratioInfo.width} x {ratioInfo.height} PNG {isProMode ? '· Thumbnail Pro' : '· Free presets'}</small>
                  </div>
                  <div
                    ref={stageRef}
                    className={`thumbnail-preview-stage ratio-${ratio.replace(':', '-')} ${isProMode ? 'is-pro' : ''}`}
                    style={{ cursor: stageCursor }}
                    onPointerDown={(event) => {
                      if (!isProMode || !canvasRef.current) return;
                      dragRef.current = {
                        layer: activeLayer,
                        startX: event.clientX,
                        startY: event.clientY,
                        startState: {
                          imageOffset,
                          titlePosition,
                          subtitlePosition,
                          ribbonPosition,
                          stickerPosition
                        }
                      };
                    }}
                  >
                    <canvas ref={canvasRef} />
                    {isProMode && (
                      <div className="thumbnail-pro-overlay">
                        <span><Move size={14} /> Drag: {activeLayer}</span>
                        <small>VIP canvas mode</small>
                      </div>
                    )}
                  </div>
                </div>

                <div className="thumbnail-export-rail">
                  <article className="thumbnail-note-card">
                    <strong>{isProMode ? 'Thumbnail Pro advantage' : 'Thumbnail Studio quick mode'}</strong>
                    <div className="thumbnail-note-list">
                      <span>{isProMode ? 'Drag layers directly in the preview and fine-tune the full composition.' : 'Fast presets stay simple and still support custom background images.'}</span>
                      <span>{backgroundAssetId || customBackgroundUrl ? 'Custom backdrop image is active for this cover.' : 'Use a gradient only or add a dedicated background image.'}</span>
                      <span>{isProMode ? 'Thumbnail Pro keeps everything in one faster workspace with manual placement and cleaner creator controls.' : 'Upgrade later for the free-transform VIP workflow.'}</span>
                    </div>
                  </article>
                  <button className="primary-button" type="button" disabled={isExporting} onClick={handleExport}>
                    <Download size={16} />
                    {isExporting ? 'Exporting PNG...' : 'Export PNG'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      {showPromoUnlock && (
        <ThumbnailPromoModal
          access={premiumAccess}
          onAccessChange={(nextAccess) => {
            setPremiumAccess(nextAccess);
            setStudioMode('pro');
          }}
          onClose={() => setShowPromoUnlock(false)}
          pushToast={pushToast}
        />
      )}
      {showPlanModal && (
        <PremiumOfferModal
          reason="Unlock Thumbnail Pro to use free transform, manual layer placement, richer image tuning, and creator-grade PNG cover controls."
          accountUser={accountUser}
          onClose={() => setShowPlanModal(false)}
          onConnectAccount={() => {
            setShowPlanModal(false);
            onOpenAccount?.();
          }}
          onAccessChange={(nextAccess) => {
            setPremiumAccess(nextAccess);
            setStudioMode('pro');
          }}
          pushToast={pushToast}
        />
      )}
    </div>
  );
}
