import { Minimize2, Maximize, Pause, Play, RotateCcw, Scissors, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { formatTime } from '../lib/format';
import type { EditorController } from '../state/useEditorState';
import type { Clip, EffectInstance, MediaAsset, ProjectSettings } from '../types/edify';

type EffectPresentation = {
  filter: string;
  className: string;
  extraScale: number;
  vignetteOpacity: number;
  noiseOpacity: number;
  rgbOpacity: number;
  barsOpacity: number;
};

type TransitionPresentation = {
  className: string;
  opacity?: number;
  extraTransform: string;
  extraFilter: string;
  clipPath?: string;
};

type TransitionOverlay = {
  name: string;
  className: string;
  style: CSSProperties;
};

type TextAnimationPresentation = {
  className: string;
  style: CSSProperties;
  revealText?: string;
};

const projectFormats: Record<ProjectSettings['aspectRatio'], Pick<ProjectSettings, 'aspectRatio' | 'resolution'>> = {
  '16:9': { aspectRatio: '16:9', resolution: { width: 1920, height: 1080 } },
  '9:16': { aspectRatio: '9:16', resolution: { width: 1080, height: 1920 } },
  '1:1': { aspectRatio: '1:1', resolution: { width: 1080, height: 1080 } },
  '4:5': { aspectRatio: '4:5', resolution: { width: 1080, height: 1350 } },
  '21:9': { aspectRatio: '21:9', resolution: { width: 2560, height: 1080 } }
};

const aspectRatioCss: Record<ProjectSettings['aspectRatio'], string> = {
  '16:9': '16 / 9',
  '9:16': '9 / 16',
  '1:1': '1 / 1',
  '4:5': '4 / 5',
  '21:9': '21 / 9'
};

const aspectWidthMultiplier: Record<ProjectSettings['aspectRatio'], number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
  '21:9': 21 / 9
};

function effectPresentation(effects: EffectInstance[]): EffectPresentation {
  const filters: string[] = [];
  const classes: string[] = [];
  let extraScale = 1;
  let vignetteOpacity = 0.42;
  let noiseOpacity = 0;
  let rgbOpacity = 0;
  let barsOpacity = 0;

  for (const effect of effects.filter((item) => item.enabled)) {
    const key = `${effect.kind} ${effect.name}`.toLowerCase();
    const amount = Math.max(0, Math.min(1, effect.intensity / 100));

    if (key.includes('blur')) filters.push(`blur(${(amount * 7).toFixed(2)}px)`);
    if (key.includes('lens-blur')) filters.push(`blur(${(amount * 4).toFixed(2)}px) saturate(${(1 + amount * 0.15).toFixed(2)})`);
    if (key.includes('sharpen')) filters.push(`contrast(${(1 + amount * 0.18).toFixed(2)}) saturate(${(1 + amount * 0.1).toFixed(2)})`);
    if (key.includes('black') || key.includes('white')) filters.push(`grayscale(${amount.toFixed(2)})`);
    if (key.includes('contrast')) filters.push(`contrast(${(1 + amount * 0.58).toFixed(2)})`);
    if (key.includes('saturation') || key.includes('gaming')) filters.push(`saturate(${(1 + amount * 0.72).toFixed(2)}) contrast(${(1 + amount * 0.18).toFixed(2)})`);
    if (key.includes('warm')) filters.push(`sepia(${(amount * 0.36).toFixed(2)}) saturate(${(1 + amount * 0.2).toFixed(2)})`);
    if (key.includes('cool') || key.includes('cinematic')) filters.push(`hue-rotate(${Math.round(amount * 205)}deg) saturate(${(1 - amount * 0.12).toFixed(2)}) contrast(${(1 + amount * 0.18).toFixed(2)})`);
    if (key.includes('glow') || key.includes('bloom')) filters.push(`drop-shadow(0 0 ${Math.round(12 + amount * 24)}px rgba(66,232,255,0.62))`);
    if (key.includes('duotone')) filters.push(`sepia(${(amount * 0.35).toFixed(2)}) hue-rotate(${Math.round(250 * amount)}deg) saturate(${(1 + amount * 0.65).toFixed(2)})`);
    if (key.includes('shadow-lift')) filters.push(`brightness(${(1 + amount * 0.12).toFixed(2)}) contrast(${(1 - amount * 0.08).toFixed(2)})`);
    if (key.includes('highlight-roll')) filters.push(`brightness(${(1 + amount * 0.1).toFixed(2)}) contrast(${(1 + amount * 0.2).toFixed(2)})`);
    if (key.includes('aura') || key.includes('skin light') || key.includes('dream lens')) filters.push(`brightness(${(1 + amount * 0.16).toFixed(2)}) saturate(${(1 + amount * 0.18).toFixed(2)}) drop-shadow(0 0 ${Math.round(18 + amount * 30)}px rgba(159,124,255,0.46))`);
    if (key.includes('golden hour') || key.includes('halation')) filters.push(`sepia(${(amount * 0.28).toFixed(2)}) brightness(${(1 + amount * 0.12).toFixed(2)}) saturate(${(1 + amount * 0.28).toFixed(2)})`);
    if (key.includes('studio clean hdr')) filters.push(`contrast(${(1 + amount * 0.28).toFixed(2)}) saturate(${(1 + amount * 0.18).toFixed(2)}) brightness(${(1 + amount * 0.08).toFixed(2)})`);
    if (key.includes('cinematic fog')) filters.push(`contrast(${(1 - amount * 0.1).toFixed(2)}) saturate(${(1 - amount * 0.12).toFixed(2)}) blur(${(amount * 1.2).toFixed(2)}px)`);
    if (key.includes('teal orange')) filters.push(`sepia(${(amount * 0.18).toFixed(2)}) hue-rotate(${Math.round(amount * 190)}deg) saturate(${(1 + amount * 0.36).toFixed(2)}) contrast(${(1 + amount * 0.2).toFixed(2)})`);
    if (key.includes('noir luxe')) filters.push(`grayscale(${amount.toFixed(2)}) contrast(${(1 + amount * 0.42).toFixed(2)}) brightness(${(1 - amount * 0.08).toFixed(2)})`);
    if (key.includes('portra') || key.includes('beauty grade')) filters.push(`sepia(${(amount * 0.14).toFixed(2)}) brightness(${(1 + amount * 0.1).toFixed(2)}) saturate(${(1 + amount * 0.16).toFixed(2)})`);
    if (key.includes('e-sport') || key.includes('cyber contrast')) filters.push(`saturate(${(1 + amount * 0.58).toFixed(2)}) contrast(${(1 + amount * 0.32).toFixed(2)}) hue-rotate(${Math.round(amount * 24)}deg)`);
    if (key.includes('luxury ad') || key.includes('festival film')) filters.push(`contrast(${(1 + amount * 0.18).toFixed(2)}) saturate(${(1 - amount * 0.08).toFixed(2)}) brightness(${(1 + amount * 0.05).toFixed(2)})`);
    if (key.includes('vignette')) vignetteOpacity = Math.max(vignetteOpacity, 0.42 + amount * 0.48);
    if (key.includes('noise') || key.includes('grain')) noiseOpacity = Math.max(noiseOpacity, amount * 0.34);
    if (key.includes('rgb') || key.includes('chromatic') || key.includes('glitch') || key.includes('vhs') || key.includes('pixel-sort') || key.includes('prism') || key.includes('anamorphic')) rgbOpacity = Math.max(rgbOpacity, 0.16 + amount * 0.46);
    if (key.includes('cinematic-bars') || key.includes('cinematic bars')) barsOpacity = Math.max(barsOpacity, 0.72);
    if (key.includes('flicker')) classes.push('effect-flicker');
    if (key.includes('shake') || key.includes('whip') || key.includes('speed-lines') || key.includes('velocity')) classes.push('effect-shake');
    if (key.includes('zoom punch') || key.includes('zoom') || key.includes('motion-blur') || key.includes('warp')) extraScale = Math.max(extraScale, 1 + amount * 0.09);
  }

  return {
    filter: filters.join(' '),
    className: classes.join(' '),
    extraScale,
    vignetteOpacity,
    noiseOpacity,
    rgbOpacity,
    barsOpacity
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOut(value: number) {
  return 1 - Math.pow(1 - clamp01(value), 3);
}

function textAnimationPresentation(effects: EffectInstance[], progress: number, text = ''): TextAnimationPresentation {
  const classes: string[] = [];
  const transforms: string[] = [];
  const style: CSSProperties = {};
  let opacity = 1;
  let revealText: string | undefined;
  const intro = easeOut(progress / 0.22);
  const outro = easeOut((1 - progress) / 0.22);

  for (const effect of effects.filter((item) => item.enabled)) {
    const key = `${effect.kind} ${effect.name}`.toLowerCase();
    const amount = Math.max(0.25, Math.min(1, effect.intensity / 100));

    if (key.includes('fade in')) opacity = Math.min(opacity, intro);
    if (key.includes('fade out')) opacity = Math.min(opacity, outro);
    if (key.includes('cinematic fade')) {
      opacity = Math.min(opacity, intro, outro);
      style.letterSpacing = `${(1 - intro) * 10}px`;
    }
    if (key.includes('slide up')) transforms.push(`translateY(${(1 - intro) * 44}px)`);
    if (key.includes('slide down')) transforms.push(`translateY(${-(1 - intro) * 44}px)`);
    if (key.includes('slide left') && !key.includes('exit')) transforms.push(`translateX(${(1 - intro) * 70}px)`);
    if (key.includes('slide right') && !key.includes('exit')) transforms.push(`translateX(${-(1 - intro) * 70}px)`);
    if (key.includes('pop in')) transforms.push(`scale(${0.72 + intro * 0.28})`);
    if (key.includes('bounce in')) {
      const bounce = progress < 0.25 ? 1 + Math.sin(progress * Math.PI * 10) * 0.08 * (1 - intro) : 1;
      transforms.push(`scale(${0.68 + intro * 0.32 * bounce})`);
    }
    if (key.includes('zoom in')) transforms.push(`scale(${0.54 + intro * 0.46})`);
    if (key.includes('zoom out') && !key.includes('exit')) transforms.push(`scale(${1.28 - intro * 0.28})`);
    if (key.includes('blur reveal')) style.filter = `${style.filter ?? ''} blur(${((1 - intro) * 12 * amount).toFixed(2)}px)`;
    if (key.includes('typewriter')) revealText = text.slice(0, Math.max(1, Math.ceil(text.length * clamp01(progress / 0.48))));
    if (key.includes('karaoke glow')) classes.push('text-karaoke-glow');
    if (key.includes('neon flicker')) classes.push('text-neon-flicker');
    if (key.includes('glitch text')) classes.push('text-glitch');
    if (key.includes('wave text')) classes.push('text-wave');
    if (key.includes('letter spacing')) style.letterSpacing = `${(1 - intro) * 14}px`;
    if (key.includes('lower third sweep')) classes.push('text-lower-third-sweep');
    if (key.includes('word punch')) transforms.push(`scale(${1 + Math.sin(progress * Math.PI * 8) * 0.05 * amount})`);
    if (key.includes('spin in')) transforms.push(`rotate(${(1 - intro) * -18}deg) scale(${0.78 + intro * 0.22})`);
    if (key.includes('skew snap')) transforms.push(`skewX(${(1 - intro) * -14}deg)`);
    if (key.includes('vip type burst')) {
      revealText = text.slice(0, Math.max(1, Math.ceil(text.length * clamp01(progress / 0.32))));
      transforms.push(`scale(${0.9 + Math.sin(progress * Math.PI * 10) * 0.04 * amount})`);
      classes.push('text-vip-type-burst');
    }
    if (key.includes('glossy word pop') || key.includes('caption bounce pro')) transforms.push(`scale(${0.78 + intro * 0.22 + Math.sin(progress * Math.PI * 6) * 0.035 * amount})`);
    if (key.includes('diamond reveal')) classes.push('text-diamond-reveal');
    if (key.includes('cinematic drift in') || key.includes('credit fade deluxe')) {
      opacity = Math.min(opacity, intro, outro);
      transforms.push(`translateY(${(1 - intro) * 26}px)`);
      style.letterSpacing = `${(1 - intro) * 12}px`;
    }
    if (key.includes('anamorphic sweep text')) classes.push('text-anamorphic-sweep');
    if (key.includes('trailer slam')) transforms.push(`scale(${1.18 - intro * 0.18}) translateY(${(1 - intro) * -18}px)`);
    if (key.includes('hud glitch in') || key.includes('cyber scan reveal')) {
      classes.push('text-glitch', 'text-cyber-scan');
      opacity = Math.min(opacity, intro);
    }
    if (key.includes('rank flash text') || key.includes('combo counter pop')) {
      classes.push('text-rank-flash');
      transforms.push(`scale(${1 + Math.sin(progress * Math.PI * 9) * 0.06 * amount})`);
    }
    if (key.includes('exit drop')) {
      opacity = Math.min(opacity, outro);
      transforms.push(`translateY(${(1 - outro) * 72}px)`);
    }
    if (key.includes('exit blur')) {
      opacity = Math.min(opacity, outro);
      style.filter = `${style.filter ?? ''} blur(${((1 - outro) * 12 * amount).toFixed(2)}px)`;
    }
    if (key.includes('exit slide left')) {
      opacity = Math.min(opacity, outro);
      transforms.push(`translateX(${-(1 - outro) * 86}px)`);
    }
    if (key.includes('exit slide right')) {
      opacity = Math.min(opacity, outro);
      transforms.push(`translateX(${(1 - outro) * 86}px)`);
    }
  }

  style.opacity = opacity;
  if (transforms.length > 0) {
    style.transform = `translateX(-50%) ${transforms.join(' ')}`;
  }

  return { className: classes.join(' '), style, revealText };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function textStyleClasses(name = '', effects: EffectInstance[] = []) {
  const keys = [name, ...effects.filter((effect) => effect.enabled && effect.kind === 'text-style').map((effect) => effect.name)]
    .filter(Boolean)
    .map((value) => `text-style-${slugify(value)}`);
  return keys.join(' ');
}

function animationTransform(style: CSSProperties) {
  return String(style.transform ?? '').replace('translateX(-50%)', '').trim();
}

function playbackSpeed(effects: EffectInstance[] = []) {
  const speed = effects.find((effect) => effect.enabled && effect.kind === 'speed');
  return speed ? Math.max(0.1, Math.min(4, speed.intensity / 100)) : 1;
}

function clipGain(clip: { start: number; duration: number; audio: { volume: number; fadeIn: number; fadeOut: number } }, playhead: number, masterVolume = 1) {
  const local = Math.max(0, playhead - clip.start);
  const fadeIn = clip.audio.fadeIn > 0 ? clamp01(local / clip.audio.fadeIn) : 1;
  const fadeOutStart = Math.max(0, clip.duration - clip.audio.fadeOut);
  const fadeOut = clip.audio.fadeOut > 0 && local > fadeOutStart ? clamp01((clip.duration - local) / clip.audio.fadeOut) : 1;
  return Math.max(0, Math.min(1, clip.audio.volume * fadeIn * fadeOut * masterVolume));
}

function transitionFamily(style = '') {
  const key = style.toLowerCase();
  if (key.includes('fade') || key.includes('dissolve') || key.includes('luma') || key.includes('dream')) return 'fade';
  if (key.includes('whip')) return 'whip';
  if (key.includes('zoom') || key.includes('tunnel')) return 'zoom';
  if (key.includes('glitch') || key.includes('vhs') || key.includes('pixel')) return 'glitch';
  if (key.includes('burn') || key.includes('flash frame') || key.includes('flash') || key.includes('light leak') || key.includes('gate')) return 'burn';
  if (key.includes('glass') || key.includes('prism') || key.includes('luxury') || key.includes('beam') || key.includes('refraction')) return 'glass';
  if (key.includes('roll') || key.includes('spin') || key.includes('flip')) return 'roll';
  if (key.includes('shockwave') || key.includes('impact')) return 'shockwave';
  if (key.includes('anamorphic') || key.includes('blur')) return 'anamorphic';
  if (key.includes('mask') || key.includes('ink')) return 'mask';
  if (key.includes('split') || key.includes('slide') || key.includes('push')) return 'split';
  if (key.includes('liquid') || key.includes('beauty') || key.includes('heatwave')) return 'liquid';
  if (key.includes('parallax')) return 'parallax';
  return 'sweep';
}

function transitionRange(clip: Clip) {
  if (!clip.transition) return null;
  const duration = Math.max(0.18, clip.transition.duration ?? 0.8);
  const at = clip.transition.at ?? (clip.transition.placement === 'start' ? clip.start : clip.start + clip.duration);
  const placement = clip.transition.placement ?? 'end';
  if (placement === 'start') return { start: at - duration * 0.5, end: at + duration, duration, placement };
  if (placement === 'center') return { start: at - duration / 2, end: at + duration / 2, duration, placement };
  return { start: at - duration, end: at + duration * 0.5, duration, placement };
}

function transitionActive(clip: Clip, playhead: number) {
  const range = transitionRange(clip);
  return Boolean(range && playhead >= range.start && playhead <= range.end);
}

function transitionPresentation(clip: Clip, playhead: number): TransitionPresentation {
  const range = transitionRange(clip);
  if (!range || playhead < range.start || playhead > range.end) {
    return { className: '', extraTransform: '', extraFilter: '' };
  }
  const raw = clamp01((playhead - range.start) / Math.max(0.01, range.end - range.start));
  const eased = easeOut(raw);
  const key = `${clip.transition?.style ?? ''}`.toLowerCase();
  const family = transitionFamily(clip.transition?.style);
  const isStart = range.placement === 'start';
  const fade = isStart ? eased : 1 - eased;
  const presentation: TransitionPresentation = {
    className: `transition-layer-${family}`,
    extraTransform: '',
    extraFilter: ''
  };

  if (family === 'fade') {
    presentation.opacity = Math.max(0, Math.min(1, (clip.transform.opacity ?? 1) * fade));
    presentation.extraFilter = `brightness(${(1 + Math.sin(raw * Math.PI) * 0.24).toFixed(2)})`;
  }
  if (family === 'zoom') {
    presentation.extraTransform = ` scale(${(1 + Math.sin(raw * Math.PI) * 0.24).toFixed(3)})`;
    presentation.extraFilter = `brightness(${(1 + Math.sin(raw * Math.PI) * 0.5).toFixed(2)})`;
  }
  if (family === 'split') {
    const direction = isStart ? 1 - eased : -eased;
    presentation.extraTransform = ` translateX(${Math.round(direction * 180)}px)`;
  }
  if (family === 'roll') {
    presentation.extraTransform = ` rotate(${Math.round((isStart ? 1 - eased : eased) * 13)}deg) scale(1.03)`;
  }
  if (family === 'whip') {
    presentation.extraTransform = ` translateX(${Math.round((isStart ? 1 - eased : -eased) * 320)}px) skewX(${Math.round((0.5 - raw) * 18)}deg)`;
    presentation.extraFilter = 'blur(7px) brightness(1.08)';
    presentation.className = 'effect-shake';
  }
  if (family === 'anamorphic') {
    presentation.extraFilter = `blur(${(Math.sin(raw * Math.PI) * 10).toFixed(2)}px) brightness(1.2)`;
  }
  if (family === 'glass') {
    presentation.extraTransform = ` scale(${(1 + Math.sin(raw * Math.PI) * 0.06).toFixed(3)})`;
    presentation.extraFilter = `contrast(1.16) saturate(1.25) brightness(1.08)`;
  }
  if (family === 'glitch') {
    presentation.className = 'effect-shake';
    presentation.extraFilter = `hue-rotate(${Math.round(raw * 220)}deg) saturate(1.8) contrast(1.25)`;
  }
  if (family === 'burn') {
    presentation.extraFilter = `sepia(${(Math.sin(raw * Math.PI) * 0.75).toFixed(2)}) brightness(${(1 + Math.sin(raw * Math.PI) * 1.7).toFixed(2)})`;
  }
  if (family === 'shockwave') {
    presentation.extraTransform = ` scale(${(1 + Math.sin(raw * Math.PI) * 0.12).toFixed(3)})`;
    presentation.extraFilter = `brightness(${(1 + Math.sin(raw * Math.PI) * 0.9).toFixed(2)}) contrast(1.2)`;
  }
  if (family === 'mask') {
    const radius = Math.round((isStart ? eased : 1 - eased) * 130);
    presentation.clipPath = key.includes('ink')
      ? `circle(${Math.max(12, radius)}% at ${35 + Math.sin(raw * Math.PI) * 30}% ${48 + Math.cos(raw * Math.PI) * 12}%)`
      : `inset(${Math.max(0, 50 - radius / 2)}% round ${Math.max(0, 28 - radius / 5)}px)`;
  }
  if (family === 'liquid') {
    presentation.extraTransform = ` scale(${(1 + Math.sin(raw * Math.PI) * 0.12).toFixed(3)}) skewX(${Math.round(Math.sin(raw * Math.PI) * 7)}deg)`;
    presentation.extraFilter = 'blur(1.4px) saturate(1.25)';
  }
  if (family === 'parallax') {
    presentation.extraTransform = ` translate3d(${Math.round((0.5 - raw) * 70)}px, ${Math.round(Math.sin(raw * Math.PI) * -18)}px, 0) scale(${(1.03 + Math.sin(raw * Math.PI) * 0.08).toFixed(3)})`;
  }

  return presentation;
}

function clipVisibleAtPlayhead(clip: Clip, playhead: number) {
  const normal = playhead >= clip.start && playhead <= clip.start + clip.duration;
  const transitionVisible = (clip.kind === 'video' || clip.kind === 'image') && transitionActive(clip, playhead);
  return normal || transitionVisible;
}

function transitionOverlayForClips(items: Array<{ clip: Clip; trackIndex: number }>, playhead: number): TransitionOverlay | undefined {
  const active = items
    .map((item) => ({ ...item, range: transitionRange(item.clip) }))
    .filter((item) => item.clip.transition && item.range && playhead >= item.range.start && playhead <= item.range.end)
    .sort((a, b) => b.trackIndex - a.trackIndex)[0];
  if (!active?.clip.transition || !active.range) return undefined;
  const progress = clamp01((playhead - active.range.start) / Math.max(0.01, active.range.end - active.range.start));
  const family = transitionFamily(active.clip.transition.style);
  const energy = Math.pow(Math.sin(progress * Math.PI), 0.72);
  const pulse = 0.16 + energy * 0.92;
  const flash =
    family === 'burn' ? 1
    : family === 'shockwave' ? 0.92
    : family === 'glitch' ? 0.84
    : family === 'whip' ? 0.78
    : family === 'glass' ? 0.66
    : 0.58;
  return {
    name: active.clip.transition.style,
    className: `transition-${slugify(active.clip.transition.style)} transition-family-${family}`,
    style: {
      opacity: pulse,
      '--transition-progress': `${progress}`,
      '--transition-energy': `${energy}`,
      '--transition-flash': `${flash}`,
      '--transition-veil': `${0.14 + energy * 0.48}`,
      '--transition-tilt': `${(progress - 0.5) * 18}`
    } as CSSProperties
  };
}

function PreviewMediaLayer({
  clip,
  asset,
  isPlaying,
  playhead,
  masterVolume
}: {
  clip: Clip;
  asset?: MediaAsset;
  isPlaying: boolean;
  playhead: number;
  masterVolume: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastClipId = useRef<string | undefined>();
  const activeEffects = useMemo(() => effectPresentation(clip.effects), [clip.effects]);
  const activeTransition = transitionPresentation(clip, playhead);
  const activeScale = clip.transform.scale * activeEffects.extraScale;
  const imageSource = asset?.kind === 'image' ? asset.previewUrl ?? asset.thumbnailUrl : asset?.thumbnailUrl ?? asset?.previewUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !asset?.previewUrl || asset.kind !== 'video') return;
    const clipChanged = lastClipId.current !== clip.id;
    lastClipId.current = clip.id;
    const speed = playbackSpeed(clip.effects);
    const rawTargetTime = Math.max(0, clip.inPoint + (playhead - clip.start) * speed);
    const targetTime =
      Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(rawTargetTime, Math.max(0, video.duration - 0.04))
        : rawTargetTime;
    const shouldSeek =
      Number.isFinite(targetTime) &&
      (clipChanged ||
        !isPlaying ||
        video.currentTime + 0.45 < targetTime);
    if (shouldSeek) {
      video.currentTime = targetTime;
    }
    video.playbackRate = speed;
    video.volume = clipGain(clip, playhead, masterVolume);
    video.muted = video.volume <= 0.001;
    if (isPlaying) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [asset?.kind, asset?.previewUrl, clip, isPlaying, masterVolume, playhead]);

  return (
    <div
      className={`preview-media ${activeEffects.className} ${activeTransition.className}`}
      style={{
        transform: `translate(${clip.transform.x}px, ${clip.transform.y}px) scale(${activeScale}) rotate(${clip.transform.rotation}deg)${activeTransition.extraTransform}`,
        opacity: activeTransition.opacity ?? clip.transform.opacity,
        filter: [activeEffects.filter, activeTransition.extraFilter].filter(Boolean).join(' '),
        clipPath: activeTransition.clipPath
      }}
    >
      {asset?.previewUrl && asset.kind === 'video' ? (
        <video ref={videoRef} src={asset.previewUrl} playsInline />
      ) : imageSource ? (
        <img src={imageSource} alt="" />
      ) : (
        <div className="preview-gradient" />
      )}
    </div>
  );
}

export function PreviewPlayer({ editor }: { editor: EditorController }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const lastAudioClipId = useRef<string | undefined>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.82);
  const visibleClipItems = useMemo(() => {
    return editor.project.tracks
      .flatMap((track, trackIndex) =>
        track.hidden
          ? []
          : track.clips
              .filter((clip) => clipVisibleAtPlayhead(clip, editor.playhead))
              .map((clip) => ({ clip, trackIndex }))
      );
  }, [editor.playhead, editor.project.tracks]);
  const visibleClips = visibleClipItems.map((item) => item.clip);
  const visibleMediaItems = visibleClipItems
    .filter(({ clip }) => clip.kind === 'video' || clip.kind === 'image')
    .sort((a, b) => b.trackIndex - a.trackIndex || a.clip.start - b.clip.start);
  const topVisibleMediaClip = visibleMediaItems[visibleMediaItems.length - 1]?.clip;

  const activeAudioClip = visibleClips.find((clip) => clip.kind === 'audio');
  const activeAudioAsset = editor.project.assets.find((item) => item.id === activeAudioClip?.assetId);
  const selectedText = editor.selectedClip?.kind === 'text' ? editor.selectedClip : undefined;
  const visibleTextClips = visibleClips.filter((clip) => clip.kind === 'text');
  const previewTextClips = selectedText && !visibleTextClips.some((clip) => clip.id === selectedText.id)
    ? [...visibleTextClips, selectedText]
    : visibleTextClips;
  const transformClip =
    editor.selectedClip && (editor.selectedClip.kind === 'video' || editor.selectedClip.kind === 'image' || editor.selectedClip.kind === 'text')
      ? editor.selectedClip
      : topVisibleMediaClip
        ? topVisibleMediaClip
        : undefined;
  const transformBoxTransform = transformClip?.transform ?? { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  const globalEffects = effectPresentation(visibleMediaItems.flatMap(({ clip }) => clip.effects));
  const activeTransitionOverlay = useMemo(
    () => transitionOverlayForClips(visibleClipItems, editor.playhead),
    [editor.playhead, visibleClipItems]
  );
  const frameAspect = aspectRatioCss[editor.project.settings.aspectRatio];
  const frameWidth = `min(82%, calc((100vh - 410px) * ${aspectWidthMultiplier[editor.project.settings.aspectRatio]}))`;

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await frameRef.current?.requestFullscreen();
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const updateTransform = (updater: (transform: Clip['transform']) => Clip['transform']) => {
    if (!transformClip) return;
    editor.updateClip(transformClip.id, (clip) => ({
      ...clip,
      transform: updater(clip.transform)
    }));
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeAudioClip) return;
    const clipChanged = lastAudioClipId.current !== activeAudioClip.id;
    lastAudioClipId.current = activeAudioClip.id;
    const targetTime = Math.max(0, activeAudioClip.inPoint + editor.playhead - activeAudioClip.start);
    const shouldSeek =
      Number.isFinite(targetTime) &&
      (clipChanged ||
        !editor.isPlaying ||
        audio.currentTime + 0.45 < targetTime);
    if (shouldSeek) {
      audio.currentTime = targetTime;
    }
    audio.volume = clipGain(activeAudioClip, editor.playhead, masterVolume);
    audio.playbackRate = Math.max(0.5, Math.min(2, Math.pow(2, activeAudioClip.audio.pitch / 12)));
    if (editor.isPlaying) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [activeAudioAsset?.previewUrl, activeAudioClip, editor.isPlaying, editor.playhead, masterVolume]);

  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div>
          <strong>Program</strong>
          <span>{editor.project.settings.aspectRatio} safe guides</span>
        </div>
        <div className="preview-tools">
          <button
            title="Reset transform"
            onClick={() =>
              transformClip &&
              editor.updateClip(transformClip.id, (clip) => ({
                ...clip,
                transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: clip.transform.opacity }
              }))
            }
          >
            <RotateCcw size={15} />
          </button>
          <button title="Split at playhead" onClick={editor.splitSelectedClip}>
            <Scissors size={15} />
          </button>
          <select defaultValue="Half" aria-label="Preview quality">
            <option>Full</option>
            <option>Half</option>
            <option>Quarter</option>
          </select>
          <select
            value={editor.project.settings.aspectRatio}
            aria-label="Project format"
            onChange={(event) =>
              editor.updateProjectSettings(projectFormats[event.target.value as ProjectSettings['aspectRatio']])
            }
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="4:5">4:5</option>
            <option value="21:9">21:9</option>
          </select>
          <button title={isFullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'} onClick={() => void toggleFullscreen()}>
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      <div className="preview-stage">
        <div className="safe-zone outer" style={{ aspectRatio: frameAspect }} />
        <div className="safe-zone inner" style={{ aspectRatio: frameAspect }} />
        <div className="preview-frame" ref={frameRef} style={{ aspectRatio: frameAspect, width: frameWidth }}>
          {visibleMediaItems.length > 0 ? (
            visibleMediaItems.map(({ clip }) => (
              <PreviewMediaLayer
                key={clip.id}
                clip={clip}
                asset={editor.project.assets.find((item) => item.id === clip.assetId)}
                isPlaying={editor.isPlaying}
                playhead={editor.playhead}
                masterVolume={masterVolume}
              />
            ))
          ) : (
            <div className="preview-media"><div className="preview-gradient" /></div>
          )}
          <div className="preview-vignette" style={{ opacity: globalEffects.vignetteOpacity }} />
          <div className="effect-noise" style={{ opacity: globalEffects.noiseOpacity }} />
          <div className="effect-rgb" style={{ opacity: globalEffects.rgbOpacity }} />
          <div className="effect-bars" style={{ opacity: globalEffects.barsOpacity }} />
          {previewTextClips.map((textClip) => {
            const textEffects = effectPresentation(textClip.effects);
            const textProgress = clamp01((editor.playhead - textClip.start) / Math.max(0.1, textClip.duration));
            const textAnimation = textAnimationPresentation(textClip.effects, textProgress, textClip.text ?? '');
            const textStyle = textStyleClasses(textClip.name, textClip.effects);
            const textTransform = textClip.transform;
            return (
              <div
                className={`preview-text ${textStyle} ${textEffects.className} ${textAnimation.className}`}
                key={textClip.id}
                style={{
                  transform: `translateX(-50%) translate(${textTransform.x}px, ${textTransform.y}px) scale(${textTransform.scale}) rotate(${textTransform.rotation}deg) ${animationTransform(textAnimation.style)}`,
                  letterSpacing: textAnimation.style.letterSpacing,
                  textShadow: textClip.effects.some((effect) => effect.kind === 'text-shadow' && effect.enabled)
                    ? '0 0 18px rgba(0,0,0,.95), 0 8px 24px rgba(0,0,0,.85)'
                    : undefined,
                  WebkitTextStroke: textClip.effects.some((effect) => effect.kind === 'text-stroke' && effect.enabled)
                    ? '1px rgba(5,6,10,.88)'
                    : undefined,
                  background: textClip.effects.some((effect) => effect.kind === 'text-box' && effect.enabled)
                    ? 'rgba(5, 8, 16, .72)'
                    : undefined,
                  borderRadius: textClip.effects.some((effect) => effect.kind === 'text-box' && effect.enabled) ? 8 : undefined,
                  opacity: textTransform.opacity * Number(textAnimation.style.opacity ?? 1),
                  filter: [textEffects.filter, textAnimation.style.filter].filter(Boolean).join(' ')
                }}
              >
                {textAnimation.revealText ?? textClip.text}
              </div>
            );
          })}
          {activeTransitionOverlay && (
            <div className={`transition-preview-overlay ${activeTransitionOverlay.className}`} style={activeTransitionOverlay.style}>
              <i />
              <i />
              <i />
              <strong>{activeTransitionOverlay.name}</strong>
            </div>
          )}
          {transformClip && (
            <div
              className="transform-box"
              style={{
                transform: `translate(${transformBoxTransform.x}px, ${transformBoxTransform.y}px) scale(${transformBoxTransform.scale}) rotate(${transformBoxTransform.rotation}deg)`
              }}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).dataset.handle) return;
                const startX = event.clientX;
                const startY = event.clientY;
                    const initial = { ...transformBoxTransform };
                const move = (moveEvent: PointerEvent) => {
                  updateTransform((transform) => ({
                    ...transform,
                    x: initial.x + moveEvent.clientX - startX,
                    y: initial.y + moveEvent.clientY - startY
                  }));
                };
                const up = () => {
                  window.removeEventListener('pointermove', move);
                  window.removeEventListener('pointerup', up);
                };
                window.addEventListener('pointermove', move);
                window.addEventListener('pointerup', up);
              }}
            >
              {['tl', 'tr', 'bl', 'br'].map((handle) => (
                <span
                  key={handle}
                  data-handle={handle}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    const startX = event.clientX;
                    const initial = transformBoxTransform.scale;
                    const direction = handle === 'tl' || handle === 'bl' ? -1 : 1;
                    const move = (moveEvent: PointerEvent) => {
                      const delta = ((moveEvent.clientX - startX) * direction) / 260;
                      updateTransform((transform) => ({
                        ...transform,
                        scale: Math.max(0.1, Math.min(4, initial + delta))
                      }));
                    };
                    const up = () => {
                      window.removeEventListener('pointermove', move);
                      window.removeEventListener('pointerup', up);
                    };
                    window.addEventListener('pointermove', move);
                    window.addEventListener('pointerup', up);
                  }}
                />
              ))}
            </div>
          )}
          <div className="snapping-guide horizontal" />
          <div className="snapping-guide vertical" />
          <div className="fullscreen-controls">
            <button className="icon-button" onClick={editor.togglePlayback} title="Play or pause">
              {editor.isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <span>{formatTime(editor.playhead)} / {formatTime(editor.project.duration)}</span>
            <button className="secondary-button" onClick={() => void toggleFullscreen()}>
              <Minimize2 size={15} />
              Exit fullscreen
            </button>
          </div>
          {activeAudioAsset?.previewUrl && <audio ref={audioRef} src={activeAudioAsset.previewUrl} />}
        </div>
      </div>

      <div className="transport">
        <button onClick={() => editor.setPlayhead(editor.playhead - 1)} title="Skip back">
          <SkipBack size={17} />
        </button>
        <button className="play-button" onClick={editor.togglePlayback} title="Play or pause">
          {editor.isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button onClick={() => editor.setPlayhead(editor.playhead + 1)} title="Skip forward">
          <SkipForward size={17} />
        </button>
        <span className="timecode">{formatTime(editor.playhead)} / {formatTime(editor.project.duration)}</span>
        <div className="volume-control">
          <Volume2 size={16} />
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(masterVolume * 100)}
            aria-label="Preview volume"
            onChange={(event) => setMasterVolume(Number(event.target.value) / 100)}
          />
        </div>
      </div>
    </section>
  );
}
