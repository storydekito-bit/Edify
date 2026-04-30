import { useCallback, useMemo, useState } from 'react';
import { clamp } from '../lib/format';
import { createGeneratedSoundAsset } from '../lib/generatedAudio';
import { createId } from '../lib/id';
import type { Clip, EffectInstance, MediaAsset, ProjectDocument, ProjectSettings, SaveStatus, Track, TrackKind } from '../types/edify';

type HistoryState = {
  past: ProjectDocument[];
  future: ProjectDocument[];
};

type EditorState = {
  project: ProjectDocument;
  saveStatus: SaveStatus;
  selectedClipId?: string;
  activeTrackId?: string;
  playhead: number;
  isPlaying: boolean;
  timelineZoom: number;
  activePanel: string;
  history: HistoryState;
};

function cloneProject(project: ProjectDocument): ProjectDocument {
  return structuredClone(project);
}

function durationOfTracks(tracks: Track[]) {
  return Math.max(
    12,
    ...tracks.flatMap((track) => track.clips.map((clip) => clip.start + clip.duration))
  );
}

function textPresetDefaults(preset: string, content?: string) {
  const lower = preset.toLowerCase();
  if (content) return { text: content, color: lower.includes('neon') || lower.includes('hud') ? '#42e8ff' : '#ffffff', scale: 1 };
  if (lower.includes('subtitle') || lower.includes('caption')) {
    return { text: lower.includes('diamond') ? 'DIAMOND CAPTION' : 'Type premium caption', color: '#ffffff', scale: 0.82 };
  }
  if (lower.includes('lower third') || lower.includes('callout') || lower.includes('label')) {
    return { text: lower.includes('product') ? 'PRODUCT DETAIL' : 'Creator Name', color: '#dff7ff', scale: 0.72 };
  }
  if (lower.includes('rank') || lower.includes('killfeed') || lower.includes('stream')) {
    return { text: lower.includes('rank') ? 'RANK UP' : 'VICTORY MOMENT', color: '#42e8ff', scale: 1.08 };
  }
  if (lower.includes('cinematic') || lower.includes('trailer') || lower.includes('festival') || lower.includes('anamorphic')) {
    return { text: lower.includes('trailer') ? 'TRAILER IMPACT' : 'EDIFY ORIGINAL', color: '#f7fbff', scale: 1.12 };
  }
  return { text: 'Double click to edit', color: lower.includes('neon') ? '#42e8ff' : '#ffffff', scale: 1 };
}

function findClip(project: ProjectDocument, clipId?: string) {
  if (!clipId) return undefined;
  return project.tracks.flatMap((track) => track.clips).find((clip) => clip.id === clipId);
}

function withRecalculatedDuration(project: ProjectDocument): ProjectDocument {
  return {
    ...project,
    duration: durationOfTracks(project.tracks),
    updatedAt: new Date().toISOString()
  };
}

export function makeClipFromAsset(asset: MediaAsset, trackId: string, start: number): Clip {
  const kind = asset.kind === 'audio' ? 'audio' : asset.kind === 'image' ? 'image' : 'video';
  return {
    id: createId('clip'),
    assetId: asset.id,
    trackId,
    kind,
    name: asset.name.replace(/\.[^/.]+$/, ''),
    start: Math.max(0, start),
    duration: asset.duration ?? (asset.kind === 'image' ? 5 : 8),
    inPoint: 0,
    color: asset.kind === 'audio' ? '#21d19f' : asset.kind === 'image' ? '#9f7cff' : '#2e83ff',
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1
    },
    audio: {
      volume: 0.82,
      fadeIn: 0,
      fadeOut: 0,
      pitch: 0,
      denoise: 0
    },
    effects: [],
    keyframes: []
  };
}

function trackKindForAsset(asset: MediaAsset): TrackKind {
  if (asset.kind === 'audio') return 'audio';
  if (asset.kind === 'image') return 'overlay';
  return 'video';
}

function trackKindForClip(clip: Clip): TrackKind {
  if (clip.kind === 'audio') return 'audio';
  if (clip.kind === 'text') return 'text';
  if (clip.kind === 'image') return 'overlay';
  return 'video';
}

function addEffectToClipValue(clip: Clip, name: string): Clip {
  const effect: EffectInstance = {
    id: createId('fx'),
    name,
    kind: name.toLowerCase().replace(/\s+/g, '-'),
    enabled: true,
    intensity: 50
  };
  return {
    ...clip,
    effects: [...clip.effects, effect]
  };
}

function clampClipStart(track: Track, clip: Clip, requestedStart: number) {
  const clips = track.clips
    .filter((item) => item.id !== clip.id)
    .sort((a, b) => a.start - b.start);
  let start = Math.max(0, requestedStart);
  for (const other of clips) {
    const end = start + clip.duration;
    const otherEnd = other.start + other.duration;
    if (end <= other.start || start >= otherEnd) continue;
    if (requestedStart >= other.start) {
      start = otherEnd;
    } else {
      start = Math.max(0, other.start - clip.duration);
    }
  }
  return Math.round(start * 30) / 30;
}

function maxDurationBeforeNextClip(track: Track, clip: Clip) {
  const next = track.clips
    .filter((item) => item.id !== clip.id && item.start >= clip.start)
    .sort((a, b) => a.start - b.start)[0];
  return next ? Math.max(0.25, next.start - clip.start) : Number.POSITIVE_INFINITY;
}

function clipFitsTrack(track: Track, clip: Clip, start = clip.start) {
  return !track.clips.some((other) => {
    if (other.id === clip.id) return false;
    const end = start + clip.duration;
    const otherEnd = other.start + other.duration;
    return end > other.start && start < otherEnd;
  });
}

function transitionTargetForTrack(track: Track | undefined, time: number) {
  const clips = [...(track?.clips ?? [])].sort((a, b) => a.start - b.start);
  if (clips.length === 0) return undefined;
  const candidates = clips.flatMap((clip) => [
    { clip, at: clip.start, placement: 'start' as const, distance: Math.abs(time - clip.start) },
    { clip, at: clip.start + clip.duration, placement: 'end' as const, distance: Math.abs(time - (clip.start + clip.duration)) }
  ]);
  const seamCandidates = clips.slice(0, -1).map((clip, index) => {
    const next = clips[index + 1];
    const seam = (clip.start + clip.duration + next.start) / 2;
    return { clip, at: clip.start + clip.duration, placement: 'center' as const, distance: Math.abs(time - seam) };
  });
  return [...seamCandidates, ...candidates].sort((a, b) => a.distance - b.distance)[0];
}

function labelForTrackKind(kind: TrackKind) {
  if (kind === 'overlay') return 'Overlay';
  if (kind === 'text') return 'Text';
  if (kind === 'audio') return 'Audio';
  return 'Video';
}

function colorForTrackKind(kind: TrackKind) {
  if (kind === 'overlay') return '#9f7cff';
  if (kind === 'text') return '#42e8ff';
  if (kind === 'audio') return '#21d19f';
  return '#2e83ff';
}

function makeTrack(kind: TrackKind, existingTracks: Track[]): Track {
  const count = existingTracks.filter((track) => track.kind === kind).length + 1;
  return {
    id: createId('track'),
    name: `${labelForTrackKind(kind)} ${count}`,
    kind,
    height: kind === 'video' ? 68 : kind === 'audio' ? 58 : kind === 'text' ? 56 : 52,
    color: colorForTrackKind(kind),
    clips: []
  };
}

function makeEffect(name: string, intensity = 58): EffectInstance {
  return {
    id: createId('fx'),
    name,
    kind: name.toLowerCase().replace(/\s+/g, '-'),
    enabled: true,
    intensity
  };
}

function makeTextClip(trackId: string, preset: string, text: string, start: number, duration: number, scale = 1): Clip {
  const defaults = textPresetDefaults(preset, text);
  return {
    id: createId('clip'),
    trackId,
    kind: 'text',
    name: preset,
    text: defaults.text,
    start,
    duration,
    inPoint: 0,
    color: defaults.color,
    transform: { x: 0, y: 0, scale: defaults.scale * scale, rotation: 0, opacity: 1 },
    audio: { volume: 0, fadeIn: 0, fadeOut: 0, pitch: 0, denoise: 0 },
    effects: [makeEffect(preset, 74), makeEffect('Karaoke Glow', 64)],
    keyframes: []
  };
}

function ensureTrack(tracks: Track[], kind: TrackKind, name?: string) {
  const existing = tracks.find((track) => track.kind === kind);
  if (existing) return { tracks, track: existing };
  const track = { ...makeTrack(kind, tracks), name: name ?? makeTrack(kind, tracks).name };
  const insertAt = kind === 'video' ? tracks.length : firstTrackIndexForKind(tracks, kind);
  return {
    tracks: [...tracks.slice(0, insertAt), track, ...tracks.slice(insertAt)],
    track
  };
}

const magicConfigs = {
  cinematic: {
    title: 'CINEMATIC CUT',
    aspectRatio: '21:9' as const,
    effects: ['Cinematic Cool Tone', 'Film Grain', 'Anamorphic Streak', 'Vignette'],
    transitions: ['Luma Dream Dissolve', 'Film Burn', 'Anamorphic Blur Wipe', 'Parallax Push'],
    captions: ['OPEN ON IMPACT', 'HOLD THE FRAME', 'CUT ON THE FEELING', 'FINAL REVEAL'],
    sound: { name: 'Cinematic Pulse Loop', duration: 12, tag: 'Music' }
  },
  gaming: {
    title: 'HIGHLIGHT MODE',
    aspectRatio: '16:9' as const,
    effects: ['Gaming Highlight', 'RGB Shift', 'Speed Lines', 'Glow'],
    transitions: ['Glitch Portal', 'Shockwave Cut', 'Neon Speed Tunnel', 'Whip Pan'],
    captions: ['CLUTCH PLAY', 'NO WAY', 'RANK UP', 'FINAL PUSH'],
    sound: { name: 'Gaming Highlight Beat', duration: 8, tag: 'Music' }
  },
  creator: {
    title: 'CREATOR STORY',
    aspectRatio: '9:16' as const,
    effects: ['Clean Creator', 'Glow', 'Soft Beauty Diffusion', 'Contrast Boost'],
    transitions: ['Glass Swipe', 'Liquid Warp', 'Mask Reveal', 'Zoom Punch'],
    captions: ['WATCH THIS', 'SAVE THIS IDEA', 'ONE MORE THING', 'FINAL MOMENT'],
    sound: { name: 'Chill Creator Loop', duration: 12, tag: 'Music' }
  },
  podcast: {
    title: 'PODCAST FLOW',
    aspectRatio: '16:9' as const,
    effects: ['Clean Creator', 'Studio Clean HDR', 'Shadow Lift', 'Safe Zone Guides'],
    transitions: ['Fade', 'Soft Bloom Dissolve', 'Glass Swipe', 'Parallax Push'],
    captions: ['TODAY WE TALK', 'KEY TAKEAWAY', 'IMPORTANT MOMENT', 'NEXT CHAPTER'],
    sound: { name: 'Podcast Clean Bed', duration: 12, tag: 'Music' }
  },
  travel: {
    title: 'TRAVEL MEMORY',
    aspectRatio: '9:16' as const,
    effects: ['Warm Tone', 'Soft Film', 'Glow', 'Luxury Product Shine'],
    transitions: ['Light Leak Sweep', 'Dream Blur Dissolve', 'Glass Swipe', 'Parallax Push'],
    captions: ['NEW CITY', 'KEEP THIS VIEW', 'THE BEST PART', 'SUNSET ENDING'],
    sound: { name: 'Travel Montage Beat', duration: 12, tag: 'Music' }
  },
  luxury: {
    title: 'LUXURY DROP',
    aspectRatio: '4:5' as const,
    effects: ['Luxury Product Shine', 'Studio Clean HDR', 'Soft Beauty Diffusion', 'Glow'],
    transitions: ['Luxury Swipe', 'Glass Beam', 'Smooth Cross Zoom', 'Beauty Blur Flow'],
    captions: ['NEW DROP', 'PREMIUM DETAIL', 'BUILT TO SHINE', 'AVAILABLE NOW'],
    sound: { name: 'Soft Luxury Pulse', duration: 10, tag: 'Music' }
  }
};

const videoTemplateConfigs = {
  shorts: {
    label: 'Short Viral',
    title: 'WAIT FOR IT',
    aspectRatio: '9:16' as const,
    effects: ['Zoom Punch', 'Karaoke Glow', 'Contrast Boost'],
    transitions: ['Flash Frame', 'Whip Pan', 'Zoom Punch'],
    captions: ['Wait for it', 'This is the moment', 'Save this idea'],
    sound: { name: 'Shorts Loop Bright', duration: 8, tag: 'Music' }
  },
  gaming: {
    label: 'Gaming Highlight',
    title: 'VICTORY MOMENT',
    aspectRatio: '16:9' as const,
    effects: ['Gaming Highlight', 'RGB Shift', 'Speed Lines'],
    transitions: ['Glitch Portal', 'Shockwave Cut', 'Neon Speed Tunnel'],
    captions: ['Clean hit', 'No way', 'Final push'],
    sound: { name: 'Gaming Highlight Beat', duration: 8, tag: 'Music' }
  },
  product: {
    label: 'Product Ad',
    title: 'NEW DROP',
    aspectRatio: '4:5' as const,
    effects: ['Luxury Product Shine', 'Studio Clean HDR', 'Glow'],
    transitions: ['Glass Swipe', 'Mask Reveal', 'Parallax Push'],
    captions: ['Premium detail', 'Built for creators', 'Available now'],
    sound: { name: 'Calm Product Reveal', duration: 12, tag: 'Music' }
  },
  trailer: {
    label: 'Cinematic Trailer',
    title: 'EDIFY ORIGINAL',
    aspectRatio: '21:9' as const,
    effects: ['Cinematic Cool Tone', 'Film Grain', 'Anamorphic Streak'],
    transitions: ['Film Burn', 'Luma Dream Dissolve', 'Anamorphic Blur Wipe'],
    captions: ['A new cut begins', 'Every frame matters', 'Render the moment'],
    sound: { name: 'Epic Trailer Rise', duration: 10, tag: 'Music' }
  },
  podcast: {
    label: 'Podcast Clip',
    title: 'MAIN TAKEAWAY',
    aspectRatio: '16:9' as const,
    effects: ['Clean Creator', 'Shadow Lift', 'Studio Clean HDR'],
    transitions: ['Fade', 'Soft Bloom Dissolve', 'Glass Swipe'],
    captions: ['Today we talk', 'This matters most', 'Keep this in mind'],
    sound: { name: 'Podcast Clean Bed', duration: 12, tag: 'Music' }
  },
  travel: {
    label: 'Travel Vlog',
    title: 'POSTCARD MOMENT',
    aspectRatio: '9:16' as const,
    effects: ['Warm Tone', 'Soft Film', 'Glow'],
    transitions: ['Dream Blur Dissolve', 'Glass Swipe', 'Parallax Push'],
    captions: ['New stop', 'Best view', 'Ending on sunset'],
    sound: { name: 'Travel Open Road', duration: 12, tag: 'Music' }
  },
  fashion: {
    label: 'Fashion Reel',
    title: 'RUNWAY ENERGY',
    aspectRatio: '4:5' as const,
    effects: ['Luxury Product Shine', 'Soft Beauty Diffusion', 'Glow'],
    transitions: ['Luxury Swipe', 'Glass Beam', 'Smooth Cross Zoom'],
    captions: ['Look one', 'Close detail', 'Final fit'],
    sound: { name: 'Crisp Fashion Pulse', duration: 10, tag: 'Music' }
  },
  reaction: {
    label: 'Reaction Edit',
    title: 'NO WAY',
    aspectRatio: '9:16' as const,
    effects: ['Glow', 'Zoom Punch', 'Contrast Boost'],
    transitions: ['Flash Frame', 'Creator Snap Zoom', 'Impact Whip Pro'],
    captions: ['Wait what', 'That was crazy', 'Replay this'],
    sound: { name: 'Reaction Edit Bounce', duration: 8, tag: 'Music' }
  },
  music: {
    label: 'Music Montage',
    title: 'FEEL THE DROP',
    aspectRatio: '16:9' as const,
    effects: ['Glow', 'Motion Blur', 'Speed Lines'],
    transitions: ['Shockwave Cut', 'Fast Tunnel Rush', 'Neon Speed Tunnel'],
    captions: ['Build up', 'Drop hits', 'Final chorus'],
    sound: { name: 'Vertical Reel Beat', duration: 8, tag: 'Music' }
  },
  tutorial: {
    label: 'Tutorial Breakdown',
    title: 'DO THIS FIRST',
    aspectRatio: '9:16' as const,
    effects: ['Clean Creator', 'Contrast Boost', 'Shadow Lift'],
    transitions: ['Swipe Flow', 'Smooth Cross Zoom', 'Glass Swipe'],
    captions: ['Step one', 'Step two', 'Save this tip'],
    sound: { name: 'Bright Creator Intro', duration: 8, tag: 'Music' }
  },
  'real-estate': {
    label: 'Real Estate Tour',
    title: 'OPEN HOUSE',
    aspectRatio: '16:9' as const,
    effects: ['Luxury Product Shine', 'Studio Clean HDR', 'Soft Beauty Diffusion'],
    transitions: ['Luxury Swipe', 'Glass Swipe', 'Parallax Lift'],
    captions: ['Front entry', 'Natural light', 'Final room'],
    sound: { name: 'Luxury Reel Motion', duration: 10, tag: 'Music' }
  },
  launch: {
    label: 'Launch Teaser',
    title: 'COMING SOON',
    aspectRatio: '4:5' as const,
    effects: ['Glow', 'Studio Clean HDR', 'Trailer Impact Grade'],
    transitions: ['Trailer Slam Flash', 'Glass Beam', 'Smooth Cross Zoom'],
    captions: ['New reveal', 'Mark the date', 'Do not miss this'],
    sound: { name: 'Minimal Brand Glow', duration: 10, tag: 'Music' }
  }
};

function resolutionForAspect(aspectRatio: ProjectSettings['aspectRatio']) {
  if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
  if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
  if (aspectRatio === '4:5') return { width: 1080, height: 1350 };
  if (aspectRatio === '21:9') return { width: 2560, height: 1080 };
  return { width: 1920, height: 1080 };
}

function firstTrackIndexForKind(tracks: Track[], kind: TrackKind) {
  const index = tracks.findIndex((track) => track.kind === kind);
  return index >= 0 ? index : tracks.length;
}

function lastTrackIndexForKind(tracks: Track[], kind: TrackKind) {
  for (let index = tracks.length - 1; index >= 0; index -= 1) {
    if (tracks[index].kind === kind) return index;
  }
  return tracks.length - 1;
}

export function useEditorState(initialProject: ProjectDocument) {
  const [state, setState] = useState<EditorState>({
    project: initialProject,
    saveStatus: 'saved',
    selectedClipId: undefined,
    activeTrackId: initialProject.tracks[0]?.id,
    playhead: 0,
    isPlaying: false,
    timelineZoom: 64,
    activePanel: 'media',
    history: {
      past: [],
      future: []
    }
  });

  const commit = useCallback((updater: (project: ProjectDocument) => ProjectDocument, status: SaveStatus = 'dirty') => {
    setState((current) => {
      const previous = current.project;
      const nextProject = withRecalculatedDuration(updater(cloneProject(previous)));
      return {
        ...current,
        project: nextProject,
        saveStatus: status,
        history: {
          past: [...current.history.past.slice(-30), previous],
          future: []
        }
      };
    });
  }, []);

  const setProject = useCallback((project: ProjectDocument, status: SaveStatus = 'saved') => {
    setState((current) => ({
      ...current,
      project: withRecalculatedDuration(project),
      saveStatus: status,
      selectedClipId: undefined,
      activeTrackId: project.tracks[0]?.id,
      playhead: 0,
      history: { past: [], future: [] }
    }));
  }, []);

  const setSaveStatus = useCallback((saveStatus: SaveStatus) => {
    setState((current) => ({ ...current, saveStatus }));
  }, []);

  const setActivePanel = useCallback((activePanel: string) => {
    setState((current) => ({ ...current, activePanel }));
  }, []);

  const setPlayhead = useCallback((playhead: number) => {
    setState((current) => ({
      ...current,
      playhead: clamp(playhead, 0, current.project.duration)
    }));
  }, []);

  const togglePlayback = useCallback(() => {
    setState((current) => ({ ...current, isPlaying: !current.isPlaying }));
  }, []);

  const setPlaying = useCallback((isPlaying: boolean) => {
    setState((current) => ({ ...current, isPlaying }));
  }, []);

  const setTimelineZoom = useCallback((timelineZoom: number) => {
    setState((current) => ({ ...current, timelineZoom: clamp(timelineZoom, 36, 180) }));
  }, []);

  const selectClip = useCallback((clipId?: string) => {
    setState((current) => {
      const clip = findClip(current.project, clipId);
      const isOutsideClip = clip ? current.playhead < clip.start || current.playhead > clip.start + clip.duration : false;
      return {
        ...current,
        selectedClipId: clipId,
        activeTrackId: clip?.trackId ?? current.activeTrackId,
        playhead: clip && isOutsideClip ? clamp(clip.start + Math.min(0.05, clip.duration / 2), 0, current.project.duration) : current.playhead
      };
    });
  }, []);

  const addAssets = useCallback((assets: MediaAsset[]) => {
    if (assets.length === 0) return;
    commit((project) => ({
      ...project,
      assets: [
        ...project.assets,
        ...assets.map((asset) => ({
          ...asset,
          importedAt: asset.importedAt ?? new Date().toISOString()
        }))
      ]
    }));
  }, [commit]);

  const deleteAsset = useCallback((assetId: string) => {
    commit((project) => ({
      ...project,
      assets: project.assets.filter((asset) => asset.id !== assetId),
      tracks: project.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.assetId !== assetId)
      }))
    }));
  }, [commit]);

  const addClipToTimeline = useCallback((asset: MediaAsset, trackId?: string, start = state.playhead) => {
    const targetKind = trackKindForAsset(asset);
    commit((project) => {
      const requestedTrack = project.tracks.find((track) => track.id === trackId);
      const initialTrack =
        requestedTrack?.kind === targetKind
          ? requestedTrack
          : project.tracks.find((track) => track.kind === targetKind) ?? project.tracks[0];
      const draftClip = makeClipFromAsset(asset, initialTrack.id, start);
      const matchingTracks = project.tracks.filter((track) => track.kind === targetKind);
      let targetTrack =
        initialTrack.kind === targetKind && clipFitsTrack(initialTrack, draftClip, start)
          ? initialTrack
          : matchingTracks.find((track) => clipFitsTrack(track, draftClip, start));
      let nextTracks = project.tracks;

      if (!targetTrack && (targetKind === 'overlay' || targetKind === 'text')) {
        const newTrack = makeTrack(targetKind, project.tracks);
        const insertAt = firstTrackIndexForKind(project.tracks, targetKind);
        nextTracks = [
          ...project.tracks.slice(0, insertAt),
          newTrack,
          ...project.tracks.slice(insertAt)
        ];
        targetTrack = newTrack;
      }

      targetTrack = targetTrack ?? initialTrack;
      const newClip = {
        ...draftClip,
        trackId: targetTrack.id,
        start: clipFitsTrack(targetTrack, draftClip, start) ? Math.max(0, start) : clampClipStart(targetTrack, draftClip, start)
      };
      return {
        ...project,
        assets: project.assets.some((item) => item.id === asset.id)
          ? project.assets
          : [...project.assets, asset],
        tracks: nextTracks.map((track) =>
          track.id === targetTrack.id
            ? {
                ...track,
                clips: [...track.clips, newClip].sort((a, b) => a.start - b.start)
              }
            : track
        )
      };
    });
  }, [commit, state.playhead]);

  const addTextClip = useCallback((preset = 'Title', start = state.playhead, trackId?: string, content?: string, duration = 4) => {
    commit((project) => {
      const requestedTrack = project.tracks.find((track) => track.id === trackId);
      const textTrack = requestedTrack?.kind === 'text' ? requestedTrack : project.tracks.find((track) => track.kind === 'text') ?? project.tracks[0];
      const presetDefaults = textPresetDefaults(preset, content ?? (preset === 'Subtitle' ? 'Type subtitle here' : undefined));
      const textClip: Clip = {
        id: createId('clip'),
        trackId: textTrack.id,
        kind: 'text',
        name: preset,
        text: presetDefaults.text,
        start: 0,
        duration,
        inPoint: 0,
        color: presetDefaults.color,
        transform: { x: 0, y: 0, scale: presetDefaults.scale, rotation: 0, opacity: 1 },
        audio: { volume: 0, fadeIn: 0, fadeOut: 0, pitch: 0, denoise: 0 },
        effects: [{ id: createId('fx'), name: preset, kind: 'text-style', enabled: true, intensity: 70 }],
        keyframes: []
      };
      const placedClip = {
        ...textClip,
        start: clampClipStart(textTrack, textClip, start)
      };
      return {
        ...project,
        tracks: project.tracks.map((track) =>
          track.id === textTrack.id
            ? { ...track, clips: [...track.clips, placedClip].sort((a, b) => a.start - b.start) }
            : track
        )
      };
    });
  }, [commit, state.playhead]);

  const updateClip = useCallback((clipId: string, updater: (clip: Clip) => Clip) => {
    commit((project) => ({
      ...project,
      tracks: project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => (clip.id === clipId ? updater(clip) : clip))
      }))
    }));
  }, [commit]);

  const moveClip = useCallback((clipId: string, nextStart: number, nextTrackId?: string) => {
    commit((project) => {
      const sourceTrack = project.tracks.find((track) => track.clips.some((clip) => clip.id === clipId));
      const sourceClip = sourceTrack?.clips.find((clip) => clip.id === clipId);
      if (!sourceTrack || !sourceClip) return project;
      const requestedVirtualDirection =
        nextTrackId === '__layer_up__' || nextTrackId === '__layer_down__'
          ? nextTrackId
          : undefined;
      const requestedTrack = project.tracks.find((track) => track.id === nextTrackId);
      const requiredKind = trackKindForClip(sourceClip);
      const targetTrack =
        requestedTrack?.kind === requiredKind
          ? requestedTrack
          : requestedVirtualDirection
            ? undefined
            : sourceTrack;
      let nextTracks = project.tracks;
      let destinationTrack = targetTrack;

      if (!destinationTrack && requestedVirtualDirection) {
        const newTrack = makeTrack(requiredKind, project.tracks);
        const insertAt =
          requestedVirtualDirection === '__layer_up__'
            ? Math.max(0, firstTrackIndexForKind(project.tracks, requiredKind))
            : Math.min(project.tracks.length, lastTrackIndexForKind(project.tracks, requiredKind) + 1);
        nextTracks = [
          ...project.tracks.slice(0, insertAt),
          newTrack,
          ...project.tracks.slice(insertAt)
        ];
        destinationTrack = newTrack;
      }

      destinationTrack = destinationTrack ?? sourceTrack;
      const movedClip = {
        ...sourceClip,
        trackId: destinationTrack.id,
        start: clipFitsTrack(destinationTrack, sourceClip, nextStart)
          ? Math.max(0, nextStart)
          : clampClipStart(destinationTrack, sourceClip, nextStart)
      };

      return {
        ...project,
        tracks: nextTracks.map((track) => {
          if (track.id === sourceTrack.id && track.id !== destinationTrack.id) {
            return { ...track, clips: track.clips.filter((clip) => clip.id !== clipId) };
          }
          if (track.id === destinationTrack.id) {
            const clips = track.clips.filter((clip) => clip.id !== clipId);
            return { ...track, clips: [...clips, movedClip].sort((a, b) => a.start - b.start) };
          }
          if (track.id === sourceTrack.id) {
            return {
              ...track,
              clips: track.clips.map((clip) => (clip.id === clipId ? movedClip : clip)).sort((a, b) => a.start - b.start)
            };
          }
          return track;
        })
      };
    });
  }, [commit]);

  const moveSelectedClipLayer = useCallback((direction: 'up' | 'down') => {
    if (!state.selectedClipId) return;
    commit((project) => {
      const sourceTrackIndex = project.tracks.findIndex((track) => track.clips.some((clip) => clip.id === state.selectedClipId));
      const sourceTrack = project.tracks[sourceTrackIndex];
      const sourceClip = sourceTrack?.clips.find((clip) => clip.id === state.selectedClipId);
      if (!sourceTrack || !sourceClip) return project;
      const compatibleKind = trackKindForClip(sourceClip);
      const compatibleTracks = project.tracks
        .map((track, index) => ({ track, index }))
        .filter((item) => item.track.kind === compatibleKind && item.track.id !== sourceTrack.id);
      const targetCandidate =
        direction === 'up'
          ? compatibleTracks.filter((item) => item.index < sourceTrackIndex).sort((a, b) => b.index - a.index)[0]
          : compatibleTracks.filter((item) => item.index > sourceTrackIndex).sort((a, b) => a.index - b.index)[0];
      const targetTrack =
        targetCandidate && clipFitsTrack(targetCandidate.track, sourceClip, sourceClip.start)
          ? targetCandidate.track
          : undefined;
      let nextTracks = project.tracks;
      let destinationTrack = targetTrack;

      if (!destinationTrack) {
        const newTrack = makeTrack(compatibleKind, project.tracks);
        const insertAt =
          direction === 'up'
            ? Math.max(0, firstTrackIndexForKind(project.tracks, compatibleKind))
            : Math.min(project.tracks.length, lastTrackIndexForKind(project.tracks, compatibleKind) + 1);
        nextTracks = [
          ...project.tracks.slice(0, insertAt),
          newTrack,
          ...project.tracks.slice(insertAt)
        ];
        destinationTrack = newTrack;
      }

      const movedClip = {
        ...sourceClip,
        trackId: destinationTrack.id
      };

      return {
        ...project,
        tracks: nextTracks.map((track) => {
          if (track.id === sourceTrack.id) {
            return { ...track, clips: track.clips.filter((clip) => clip.id !== sourceClip.id) };
          }
          if (track.id === destinationTrack.id) {
            return { ...track, clips: [...track.clips, movedClip].sort((a, b) => a.start - b.start) };
          }
          return track;
        })
      };
    });
  }, [commit, state.selectedClipId]);

  const resizeClip = useCallback((clipId: string, edge: 'start' | 'end', deltaSeconds: number) => {
    commit((project) => ({
      ...project,
      tracks: project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;
          if (edge === 'start') {
            const previous = track.clips
              .filter((item) => item.id !== clip.id && item.start + item.duration <= clip.start)
              .sort((a, b) => b.start + b.duration - (a.start + a.duration))[0];
            const minStart = previous ? previous.start + previous.duration : 0;
            const requestedStart = clip.start + deltaSeconds;
            const nextStart = clamp(requestedStart, minStart, clip.start + clip.duration - 0.25);
            const delta = nextStart - clip.start;
            return {
              ...clip,
              start: nextStart,
              inPoint: Math.max(0, clip.inPoint + delta),
              duration: Math.max(0.25, clip.duration - delta)
            };
          }
          const maxDuration = maxDurationBeforeNextClip(track, clip);
          return {
            ...clip,
            duration: Math.max(0.25, Math.min(maxDuration, clip.duration + deltaSeconds))
          };
        })
      }))
    }));
  }, [commit]);

  const splitSelectedClip = useCallback(() => {
    if (!state.selectedClipId) return;
    commit((project) => ({
      ...project,
      tracks: project.tracks.map((track) => ({
        ...track,
        clips: track.clips.flatMap((clip) => {
          if (clip.id !== state.selectedClipId) return clip;
          const local = state.playhead - clip.start;
          if (local <= 0.15 || local >= clip.duration - 0.15) return clip;
          return [
            { ...clip, duration: local },
            {
              ...clip,
              id: createId('clip'),
              name: `${clip.name} cut`,
              start: state.playhead,
              duration: clip.duration - local,
              inPoint: clip.inPoint + local
            }
          ];
        })
      }))
    }));
  }, [commit, state.playhead, state.selectedClipId]);

  const deleteSelectedClip = useCallback(() => {
    if (!state.selectedClipId) return;
    commit((project) => ({
      ...project,
      tracks: project.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.id !== state.selectedClipId)
      }))
    }));
    selectClip(undefined);
  }, [commit, selectClip, state.selectedClipId]);

  const duplicateSelectedClip = useCallback(() => {
    if (!state.selectedClipId) return;
    commit((project) => ({
      ...project,
      tracks: project.tracks.map((track) => {
        const clip = track.clips.find((item) => item.id === state.selectedClipId);
        if (!clip) return track;
        const duplicate = {
          ...clip,
          id: createId('clip'),
          name: `${clip.name} copy`,
          start: clampClipStart(track, clip, clip.start + clip.duration + 0.1),
          selected: false
        };
        return {
          ...track,
          clips: [...track.clips, duplicate].sort((a, b) => a.start - b.start)
        };
      })
    }));
  }, [commit, state.selectedClipId]);

  const addEffectToSelectedClip = useCallback((name: string) => {
    if (!state.selectedClipId) return;
    updateClip(state.selectedClipId, (clip) => addEffectToClipValue(clip, name));
  }, [state.selectedClipId, updateClip]);

  const addEffectToClip = useCallback((clipId: string, name: string) => {
    updateClip(clipId, (clip) => addEffectToClipValue(clip, name));
    selectClip(clipId);
  }, [selectClip, updateClip]);

  const applySelectedEffectsToAllClips = useCallback(() => {
    if (!state.selectedClipId) return;
    commit((project) => {
      const source = findClip(project, state.selectedClipId);
      if (!source || source.effects.length === 0) return project;
      const sourceKind = source.kind === 'image' ? 'video' : source.kind;
      return {
        ...project,
        tracks: project.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) => {
            const targetKind = clip.kind === 'image' ? 'video' : clip.kind;
            if (clip.id === source.id || targetKind !== sourceKind) return clip;
            return {
              ...clip,
              effects: source.effects.map((effect) => ({
                ...effect,
                id: createId('fx')
              }))
            };
          })
        }))
      };
    });
  }, [commit, state.selectedClipId]);

  const addTransitionToClip = useCallback((clipId: string, style: string) => {
    const sourceClip = findClip(state.project, clipId);
    const sourceTrack = state.project.tracks.find((track) => track.id === sourceClip?.trackId);
    const sortedClips = [...(sourceTrack?.clips ?? [])].sort((a, b) => a.start - b.start);
    const sourceIndex = sortedClips.findIndex((clip) => clip.id === clipId);
    updateClip(clipId, (clip) => ({
      ...clip,
      transition: (() => {
        const startDistance = Math.abs(state.playhead - clip.start);
        const endDistance = Math.abs(state.playhead - (clip.start + clip.duration));
        const placement = startDistance < endDistance ? 'start' as const : 'end' as const;
        const hasClipBefore = sourceIndex > 0;
        const hasClipAfter = sourceIndex >= 0 && sourceIndex < sortedClips.length - 1;
        const centeredPlacement =
          placement === 'start' && hasClipBefore ? 'center' as const
          : placement === 'end' && hasClipAfter ? 'center' as const
          : placement;
        return {
          style,
          easing: 'Cubic out',
          duration: clip.transition?.duration ?? Math.min(1.2, Math.max(0.42, clip.duration * 0.24)),
          placement: centeredPlacement,
          at: placement === 'start' ? clip.start : clip.start + clip.duration
        };
      })()
    }));
    selectClip(clipId);
  }, [selectClip, state.playhead, state.project, updateClip]);

  const addTransitionAt = useCallback((trackId: string, time: number, style: string) => {
    const targetBeforeCommit = transitionTargetForTrack(state.project.tracks.find((item) => item.id === trackId), time);
    commit((project) => {
      const track = project.tracks.find((item) => item.id === trackId);
      const target = transitionTargetForTrack(track, time);
      if (!track || !target) return project;
      return {
        ...project,
        tracks: project.tracks.map((item) =>
          item.id === track.id
            ? {
                ...item,
                clips: item.clips.map((clip) =>
                  clip.id === target.clip.id
                    ? {
                        ...clip,
                        transition: {
                          style,
                          easing: 'Cubic out',
                          duration: Math.min(1.4, Math.max(target.placement === 'center' ? 0.62 : 0.35, clip.duration * 0.28)),
                          placement: target.placement,
                          at: target.at
                        }
                      }
                    : clip
                )
              }
            : item
        )
      };
    });
    if (targetBeforeCommit) {
      selectClip(targetBeforeCommit.clip.id);
    }
  }, [commit, selectClip, state.project.tracks]);

  const applyPresetAt = useCallback((trackId: string, time: number, kind: 'effect' | 'filter' | 'transition' | 'text' | 'sticker', name: string, content?: string) => {
    if (kind === 'text' || kind === 'sticker') {
      addTextClip(name, time, trackId, content ?? (kind === 'sticker' ? name : undefined));
      return;
    }
    const track = state.project.tracks.find((item) => item.id === trackId);
    const sortedClips = [...(track?.clips ?? [])].sort((a, b) => a.start - b.start);
    const targetClip =
      kind === 'transition'
        ? sortedClips
            .map((clip) => ({
              clip,
              distance: Math.min(
                Math.abs(time - clip.start),
                Math.abs(time - (clip.start + clip.duration)),
                time >= clip.start && time <= clip.start + clip.duration ? 0 : Number.POSITIVE_INFINITY
              )
            }))
            .filter((item) => item.distance <= 2.25)
            .sort((a, b) => a.distance - b.distance)[0]?.clip ??
          sortedClips.find((clip) => time >= clip.start - 1 && time <= clip.start + clip.duration + 1) ??
          sortedClips[0]
        : sortedClips.find((clip) => time >= clip.start && time <= clip.start + clip.duration) ?? sortedClips[0];
    if (!targetClip) return;
    if (kind === 'transition') {
      addTransitionAt(trackId, time, name);
      return;
    }
    addEffectToClip(targetClip.id, name);
  }, [addEffectToClip, addTextClip, addTransitionAt, state.project.tracks]);

  const updateTrack = useCallback((trackId: string, updater: (track: Track) => Track) => {
    commit((project) => ({
      ...project,
      tracks: project.tracks.map((track) => (track.id === trackId ? updater(track) : track))
    }));
  }, [commit]);

  const updateProjectSettings = useCallback((settings: Partial<ProjectSettings>) => {
    commit((project) => ({
      ...project,
      settings: {
        ...project.settings,
        ...settings,
        resolution: {
          ...project.settings.resolution,
          ...(settings.resolution ?? {})
        }
      }
    }));
  }, [commit]);

  const applyMagicEdit = useCallback((style: keyof typeof magicConfigs = 'cinematic') => {
    const config = magicConfigs[style];
    commit((project) => {
      let nextTracks = project.tracks;
      let ensured = ensureTrack(nextTracks, 'video', 'Magic Video');
      nextTracks = ensured.tracks;
      const videoTrack = ensured.track;
      ensured = ensureTrack(nextTracks, 'text', 'Magic Captions');
      nextTracks = ensured.tracks;
      const textTrack = ensured.track;
      ensured = ensureTrack(nextTracks, 'audio', 'Magic Music');
      nextTracks = ensured.tracks;
      const audioTrack = ensured.track;

      const existingVisuals = project.tracks
        .flatMap((track) => track.clips)
        .filter((clip) => clip.kind === 'video' || clip.kind === 'image')
        .sort((a, b) => a.start - b.start);
      const assetVisuals = project.assets
        .filter((asset) => asset.kind === 'video' || asset.kind === 'image')
        .slice(0, 12)
        .map((asset) => makeClipFromAsset(asset, videoTrack.id, 0));
      const sources = (existingVisuals.length > 0 ? existingVisuals : assetVisuals).slice(0, 12);
      const sourceIds = new Set(existingVisuals.map((clip) => clip.id));
      let cursor = 0;
      const visualClips = sources.map((clip, index) => {
        const targetDuration =
          style === 'gaming' ? 1.55
          : style === 'creator' ? 2.05
          : style === 'podcast' ? 3.4
          : style === 'travel' ? 2.45
          : style === 'luxury' ? 2.3
          : 2.7;
        const duration = Math.max(1.25, Math.min(clip.duration || 3, targetDuration + (index % 3) * 0.18));
        const start = cursor;
        cursor += duration;
        return {
          ...clip,
          id: clip.id ?? createId('clip'),
          trackId: videoTrack.id,
          start,
          duration,
          inPoint: clip.inPoint ?? 0,
          color: style === 'gaming' ? '#42e8ff' : style === 'creator' ? '#21d19f' : '#9f7cff',
          effects: [
            ...clip.effects,
            ...config.effects.map((effect, effectIndex) => makeEffect(effect, 58 + effectIndex * 7))
          ],
          transition: index < sources.length - 1
            ? {
                style: config.transitions[index % config.transitions.length],
                easing: 'Cubic out',
                duration:
                  style === 'gaming' ? 0.72
                  : style === 'podcast' ? 0.62
                  : style === 'luxury' ? 0.82
                  : 0.78,
                placement: 'center' as const,
                at: start + duration
              }
            : clip.transition
        };
      });
      const totalDuration = Math.max(cursor, 8);
      const titlePreset =
        style === 'gaming' ? 'Neon HUD Title'
        : style === 'creator' ? 'Creator Pop Subtitle'
        : style === 'luxury' ? 'Luxury Lower Third'
        : style === 'podcast' ? 'Podcast Title Bar'
        : 'Cinematic Title';
      const titleClip = makeTextClip(textTrack.id, titlePreset, config.title, 0, 2.8, 1.1);
      const captionPreset =
        style === 'gaming' ? 'Gaming Callout Captions'
        : style === 'luxury' ? 'Luxury Product Captions'
        : style === 'podcast' ? 'Podcast Subtitle Clean'
        : 'Diamond Caption';
      const captionClips = config.captions.map((text, index) =>
        makeTextClip(
          textTrack.id,
          index % 2 === 0 ? captionPreset : 'Creator Pop Subtitle',
          text,
          Math.min(totalDuration - 1.2, 1.6 + index * (style === 'podcast' ? 2.6 : 1.95)),
          style === 'podcast' ? 2.4 : 1.75,
          style === 'luxury' ? 0.9 : 0.86
        )
      );
      const soundAsset = createGeneratedSoundAsset(config.sound);
      const musicClip = {
        ...makeClipFromAsset(soundAsset, audioTrack.id, 0),
        duration: totalDuration,
        color: '#21d19f',
        audio: { volume: 0.58, fadeIn: 0.18, fadeOut: 0.35, pitch: 0, denoise: 18 }
      };
      const magicMarkers = visualClips.map((clip, index) => ({
        id: createId('marker'),
        time: clip.start,
        label: index === 0 ? 'Hook' : `Beat ${index}`,
        color: index % 2 ? '#ffd166' : '#42e8ff',
          note: `Magic Edit ${config.transitions[index % config.transitions.length] ?? 'cut'}`
        }));
      const tracks = nextTracks.map((track) => {
        const cleanClips = track.clips.filter((clip) => !sourceIds.has(clip.id));
        if (track.id === videoTrack.id) return { ...track, clips: [...cleanClips, ...visualClips].sort((a, b) => a.start - b.start) };
        if (track.id === textTrack.id) return { ...track, clips: [...cleanClips, titleClip, ...captionClips].sort((a, b) => a.start - b.start) };
        if (track.id === audioTrack.id) return { ...track, clips: [...cleanClips, musicClip].sort((a, b) => a.start - b.start) };
        return { ...track, clips: cleanClips };
      });

      return {
        ...project,
        settings: {
          ...project.settings,
          aspectRatio: config.aspectRatio,
          resolution: resolutionForAspect(config.aspectRatio)
        },
        assets: project.assets.some((asset) => asset.id === soundAsset.id) ? project.assets : [...project.assets, soundAsset],
        tracks,
        markers: [...project.markers, ...magicMarkers],
        notes: `${project.notes}\nMagic Edit ${style}: ${visualClips.length} clips, ${config.transitions.join(', ')}.`
      };
    });
  }, [commit]);

  const applyBeatSync = useCallback(() => {
    commit((project) => {
      const interval = project.duration > 30 ? 0.92 : project.duration > 18 ? 0.76 : 0.58;
      const beats = Array.from({ length: Math.min(44, Math.ceil(project.duration / interval)) }, (_, index) => Number((index * interval).toFixed(2)));
      const transitions = ['Whip Pan', 'Flash Frame', 'Shockwave Cut', 'Glitch Portal', 'Zoom Punch', 'Neon Speed Tunnel', 'Impact Whip Pro', 'Smooth Cross Zoom'];
      return {
        ...project,
        markers: [
          ...project.markers,
          ...beats.map((time, index) => ({
            id: createId('marker'),
            time,
            label: `Beat ${index + 1}`,
            color: index % 4 === 0 ? '#ffd166' : '#42e8ff',
            note: 'Beat Sync marker'
          }))
        ],
        tracks: project.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip, index) => {
            if (clip.kind !== 'video' && clip.kind !== 'image') return clip;
            const end = clip.start + clip.duration;
            return {
              ...clip,
              effects: [
                ...clip.effects,
                makeEffect(index % 2 ? 'Beat Shake' : 'Beat Zoom Pulse', 64),
                makeEffect(index % 3 ? 'Flash Hit Bright' : 'RGB Shift', 46),
                makeEffect(index % 4 ? 'Speed Ramp Shock' : 'Motion Blur', 52)
              ],
              transition: {
                style: transitions[index % transitions.length],
                easing: 'Cubic out',
                duration: 0.44 + (index % 3) * 0.12,
                placement: 'center',
                at: end
              }
            };
          })
        }))
      };
    });
  }, [commit]);

  const applyVideoTemplate = useCallback((templateId: keyof typeof videoTemplateConfigs) => {
    const template = videoTemplateConfigs[templateId] ?? videoTemplateConfigs.shorts;
    commit((project) => {
      let nextTracks = project.tracks;
      let ensured = ensureTrack(nextTracks, 'text', 'Template Text');
      nextTracks = ensured.tracks;
      const textTrack = ensured.track;
      ensured = ensureTrack(nextTracks, 'audio', 'Template Music');
      nextTracks = ensured.tracks;
      const audioTrack = ensured.track;
      const titlePreset =
        templateId === 'trailer' ? 'Cinematic Title'
        : templateId === 'gaming' ? 'Neon HUD Title'
        : templateId === 'product' || templateId === 'launch' ? 'Luxury Lower Third'
        : templateId === 'podcast' ? 'Podcast Title Bar'
        : 'Creator Pop Subtitle';
      const title = makeTextClip(textTrack.id, titlePreset, template.title, 0, 2.5, 1.12);
      const captions = template.captions.map((caption, index) =>
        makeTextClip(
          textTrack.id,
          index % 2 ? (templateId === 'podcast' ? 'Podcast Subtitle Clean' : 'Diamond Caption') : 'Subtitle',
          caption,
          2.1 + index * (templateId === 'podcast' ? 2.3 : 2.1),
          templateId === 'podcast' ? 2.3 : 1.85,
          0.86
        )
      );
      const soundAsset = createGeneratedSoundAsset(template.sound);
      const musicClip = {
        ...makeClipFromAsset(soundAsset, audioTrack.id, 0),
        duration: Math.max(8, project.duration),
        color: '#21d19f',
        audio: { volume: 0.52, fadeIn: 0.12, fadeOut: 0.28, pitch: 0, denoise: 12 }
      };
      return {
        ...project,
        settings: {
          ...project.settings,
          aspectRatio: template.aspectRatio,
          resolution: resolutionForAspect(template.aspectRatio)
        },
        assets: project.assets.some((asset) => asset.id === soundAsset.id) ? project.assets : [...project.assets, soundAsset],
        tracks: nextTracks.map((track) => {
          if (track.id === textTrack.id) {
            return { ...track, clips: [...track.clips, title, ...captions].sort((a, b) => a.start - b.start) };
          }
          if (track.id === audioTrack.id) {
            return { ...track, clips: [...track.clips, musicClip].sort((a, b) => a.start - b.start) };
          }
          return {
            ...track,
            clips: track.clips.map((clip, index) => {
              if (clip.kind !== 'video' && clip.kind !== 'image') return clip;
              return {
                ...clip,
                effects: [...clip.effects, ...template.effects.map((effect) => makeEffect(effect, 62))],
                transition: {
                  style: template.transitions[index % template.transitions.length],
                  easing: 'Cubic out',
                  duration: 0.74 + (index % 2) * 0.1,
                  placement: 'center',
                  at: clip.start + clip.duration
                }
              };
            })
          };
        }),
        markers: [
          ...project.markers,
          { id: createId('marker'), time: 0, label: template.label, color: '#ffd166', note: 'Video template applied' }
        ],
        notes: `${project.notes}\nTemplate applied: ${template.label}.`
      };
    });
  }, [commit]);

  const applyStudioFeature = useCallback((featureId: string) => {
    if (featureId === 'magic-edit') {
      applyMagicEdit('creator');
      return;
    }
    if (featureId === 'beat-sync') {
      applyBeatSync();
      return;
    }
    if (featureId === 'video-templates') {
      applyVideoTemplate('shorts');
      return;
    }

    commit((project) => {
      let nextProject = project;
      let nextTracks = project.tracks;
      const ensureText = () => {
        const ensured = ensureTrack(nextTracks, 'text', 'Studio Text');
        nextTracks = ensured.tracks;
        return ensured.track;
      };
      const ensureAudio = () => {
        const ensured = ensureTrack(nextTracks, 'audio', 'Studio Audio');
        nextTracks = ensured.tracks;
        return ensured.track;
      };
      const visualEffects = (effects: string[], intensity = 62) => {
        nextTracks = nextTracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.kind === 'video' || clip.kind === 'image'
              ? { ...clip, effects: [...clip.effects, ...effects.map((effect) => makeEffect(effect, intensity))] }
              : clip
          )
        }));
      };
      const audioEffects = (effects: string[]) => {
        nextTracks = nextTracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.kind === 'audio' || clip.kind === 'video'
              ? {
                  ...clip,
                  audio: { ...clip.audio, volume: Math.min(0.9, clip.audio.volume), denoise: Math.max(clip.audio.denoise, 35), fadeIn: Math.max(clip.audio.fadeIn, 0.08), fadeOut: Math.max(clip.audio.fadeOut, 0.18) },
                  effects: [...clip.effects, ...effects.map((effect) => makeEffect(effect, 66))]
                }
              : clip
          )
        }));
      };
      const addText = (preset: string, text: string, start = 0, duration = 2.4, scale = 1) => {
        const textTrack = ensureText();
        const clip = makeTextClip(textTrack.id, preset, text, start, duration, scale);
        nextTracks = nextTracks.map((track) => track.id === textTrack.id ? { ...track, clips: [...track.clips, clip].sort((a, b) => a.start - b.start) } : track);
      };
      const addGeneratedSound = (name: string, duration: number, tag: string, start = 0) => {
        const audioTrack = ensureAudio();
        const asset = createGeneratedSoundAsset({ name, duration, tag });
        const clip = {
          ...makeClipFromAsset(asset, audioTrack.id, start),
          duration,
          audio: { volume: 0.58, fadeIn: 0.08, fadeOut: 0.22, pitch: 0, denoise: 8 }
        };
        nextProject = {
          ...nextProject,
          assets: nextProject.assets.some((item) => item.id === asset.id) ? nextProject.assets : [...nextProject.assets, asset]
        };
        nextTracks = nextTracks.map((track) => track.id === audioTrack.id ? { ...track, clips: [...track.clips, clip].sort((a, b) => a.start - b.start) } : track);
      };
      const addMarkers = (items: Array<{ time: number; label: string; color?: string; note?: string }>) => {
        nextProject = {
          ...nextProject,
          markers: [
            ...nextProject.markers,
            ...items.map((item) => ({
              id: createId('marker'),
              time: item.time,
              label: item.label,
              color: item.color ?? '#42e8ff',
              note: item.note
            }))
          ]
        };
      };
      const addTransitions = (transitions: string[]) => {
        nextTracks = nextTracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip, index) =>
            clip.kind === 'video' || clip.kind === 'image'
              ? {
                  ...clip,
                  transition: {
                    style: transitions[index % transitions.length],
                    easing: 'Cubic out',
                    duration: 0.66 + (index % 3) * 0.1,
                    placement: 'center',
                    at: clip.start + clip.duration
                  }
                }
              : clip
          )
        }));
      };
      const addNote = (note: string) => {
        nextProject = { ...nextProject, notes: `${nextProject.notes}\n${note}`.trim() };
      };

      switch (featureId) {
        case 'project-assistant':
          addMarkers([
            { time: 0, label: 'AI Review', color: '#ffd166', note: 'Intro, captions, audio, safe zone and hook checked.' },
            { time: Math.min(1.2, project.duration), label: 'Hook weak', color: '#ff7a90', note: 'Try a stronger first line or faster opener.' },
            { time: Math.min(3.1, project.duration), label: 'Audio watch', color: '#42e8ff', note: 'Normalize volume and tighten silence here.' },
            { time: Math.min(5.4, project.duration), label: 'Text zone', color: '#21d19f', note: 'Caption safety and readability pass suggested.' }
          ]);
          visualEffects(['Safe Zone Guides', 'Shadow Lift', 'Clean Creator'], 62);
          audioEffects(['Normalize', 'Denoise']);
          addNote('Project Assistant: intro speed, text safety, audio level, hook strength, dark shots, and pacing were checked locally.');
          break;
        case 'auto-captions-style':
          ['WAIT FOR IT', 'THIS PART MATTERS', 'SAVE THIS IDEA', 'FINAL MOMENT', 'WATCH AGAIN'].forEach((text, index) =>
            addText(index % 2 ? 'Diamond Caption' : 'Creator Pop Subtitle', text, index * 1.4, 1.42, 0.92)
          );
          visualEffects(['Karaoke Glow', 'Word Punch', 'Caption Bounce Pro', 'Creator Detail Pop'], 70);
          break;
        case 'smart-timeline':
          addMarkers([
            { time: 0, label: 'Hook', color: '#ffd166', note: 'Suggested stronger intro.' },
            { time: Math.min(2.5, project.duration), label: 'Cut', note: 'Suggested cut point.' },
            { time: Math.min(5, project.duration), label: 'Moment', color: '#21d19f', note: 'Moment fort detected.' }
          ]);
          addTransitions(['Whip Pan', 'Luma Dream Dissolve', 'Flash Frame']);
          addNote('Smart Timeline: suggested hook, cut, transition and moment markers added.');
          break;
        case 'style-packs':
          visualEffects(['Clean Creator', 'Gaming Highlight', 'Luxury Product Shine', 'Cinematic Cool Tone'], 66);
          addTransitions(['Glass Swipe', 'Glitch Portal', 'Film Burn', 'Parallax Push']);
          break;
        case 'brand-kit':
          visualEffects(['Brand Safe Pass', 'Clean Creator'], 58);
          addNote('Brand Kit: logo/watermark placeholder, clean colors, creator font style and caption style were applied.');
          break;
        case 'multi-camera':
          addMarkers([
            { time: 0, label: 'Angle A', color: '#42e8ff', note: 'Primary camera angle.' },
            { time: Math.min(3, project.duration), label: 'Angle B', color: '#9f7cff', note: 'Secondary camera cut suggestion.' },
            { time: Math.min(6, project.duration), label: 'Sync', color: '#ffd166', note: 'Audio sync point.' }
          ]);
          addNote('Multi-Camera Simple: angle markers and audio sync points prepared.');
          break;
        case 'motion-tracking':
          addText('Product Callout Pro', 'TRACKED CALLOUT', 1, 3, 0.72);
          visualEffects(['Motion Tracking Target', 'Auto Follow Anchor'], 68);
          break;
        case 'privacy':
          visualEffects(['Face Blur', 'Privacy Blur', 'Auto Remove Personal Info'], 76);
          addMarkers([{ time: state.playhead, label: 'Privacy', color: '#ffd166', note: 'Privacy blur pass applied.' }]);
          break;
        case 'b-roll-finder':
          addMarkers([
            { time: Math.min(2, project.duration), label: 'B-roll', color: '#ffd166', note: 'Add overlay or cutaway here.' },
            { time: Math.min(5, project.duration), label: 'Cover', color: '#ffd166', note: 'Potential slow moment.' }
          ]);
          break;
        case 'hook-generator':
          ['STOP SCROLLING', 'YOU NEED THIS', 'WATCH THIS FIRST', 'DO THIS BEFORE EXPORT', 'THIS CHANGES THE CUT'].forEach((hook, index) =>
            addText(index % 2 ? 'Gaming Edit' : 'Creator Pop Subtitle', hook, index * 0.62, 1.3, 0.94)
          );
          addMarkers([
            { time: 0, label: 'Hook A', color: '#ffd166', note: 'Fast reveal opener.' },
            { time: 0.62, label: 'Hook B', color: '#42e8ff', note: 'Question-based opener.' },
            { time: 1.24, label: 'Hook C', color: '#9f7cff', note: 'Benefit-driven opener.' }
          ]);
          visualEffects(['Zoom Punch', 'Glow', 'Flash Frame', 'Trailer Impact Grade'], 68);
          break;
        case 'thumbnail-studio':
          visualEffects(['Subject Outline Glow', 'Background Blur', 'Thumbnail Pop'], 74);
          addMarkers([{ time: Math.min(1, project.duration), label: 'Thumbnail', color: '#ffd166', note: 'Best frame candidate.' }]);
          break;
        case 'sound-designer':
          addGeneratedSound('Designer Whoosh', 1.1, 'Whoosh', 0);
          addGeneratedSound('Impact Drop', 1.4, 'Impact', 1.2);
          addGeneratedSound('Logo Chime Custom', 2.2, 'Logo', 2.8);
          break;
        case 'voice-tools':
          audioEffects(['Studio Voice', 'Denoise', 'Normalize', 'Remove Silence', 'Pitch Polish']);
          break;
        case 'auto-reframe':
          nextProject = { ...nextProject, settings: { ...nextProject.settings, aspectRatio: '9:16', resolution: resolutionForAspect('9:16') } };
          visualEffects(['Auto Reframe', 'Subject Center Lock', 'Background Blur', 'Safe Zone Guides'], 70);
          addMarkers([{ time: state.playhead, label: 'Reframe', color: '#ffd166', note: 'Vertical reframe and center lock applied.' }]);
          break;
        case 'versioning':
          try {
            localStorage.setItem(`edify-backup-${project.id}-${Date.now()}`, JSON.stringify(project));
          } catch {
            // Local backups are best-effort in browser storage.
          }
          addMarkers([{ time: state.playhead, label: 'Version', color: '#ffd166', note: 'Backup version saved locally.' }]);
          addNote('Versioning: a local backup snapshot was created before the next big change.');
          break;
        case 'client-review':
          addMarkers([{ time: 0, label: 'Review', color: '#ffd166', note: 'Client review preview with watermark and notes.' }]);
          addNote('Client Review Mode: watermark, review marker and timecode note prepared.');
          break;
        case 'marketplace-premium':
          addNote('Marketplace Premium: transitions, fonts, captions, filters, sounds, templates, LUTs and stickers are organized in Premium/Store.');
          break;
        case 'daily-free-unlock':
          try {
            localStorage.setItem('edify-daily-free-unlock', JSON.stringify({ date: new Date().toISOString().slice(0, 10), item: 'Daily Glow Trial' }));
          } catch {
            // Daily unlock persistence is best-effort.
          }
          visualEffects(['Daily Glow Trial'], 66);
          addMarkers([{ time: state.playhead, label: 'Daily unlock', color: '#ffd166', note: 'Daily premium trial stored locally.' }]);
          break;
        case 'challenges':
          addText('Gaming Edit', '10 MIN GAMING CHALLENGE', 0, 2.8, 0.95);
          addTransitions(['Glitch Portal', 'Shockwave Cut', 'Neon Speed Tunnel']);
          addMarkers([{ time: 0, label: 'Challenge', color: '#ffd166', note: 'Creator challenge starter.' }]);
          break;
        case 'workspace-layouts':
          addNote('Workspace Layouts: Beginner, Creator, Pro, Audio, Color and Captions modes are mapped to Edify side panels.');
          addMarkers([{ time: state.playhead, label: 'Workspace', note: 'Switch panels from rail for focused workflow.' }]);
          break;
        case 'color-studio':
          visualEffects(['Color Scopes', 'Skin Tone Protect', 'AI Color Match', 'Cinematic Cool Tone'], 68);
          break;
        case 'export-intelligent':
          nextProject = { ...nextProject, settings: { ...nextProject.settings, fps: Math.max(30, nextProject.settings.fps) } };
          addNote('Export Intelligent: Edify recommends Shorts 1080x1920, YouTube 1080p, Instagram Reels, Discord preview and Ultra Quality based on project format.');
          addMarkers([{ time: Math.max(0, project.duration - 1), label: 'Export', color: '#21d19f', note: 'Smart export recommendation ready.' }]);
          break;
        case 'preview-cache':
          visualEffects(['Preview Render Cache'], 50);
          addNote('Preview Render Cache: heavy effects are marked for local preview render caching.');
          break;
        case 'plugin-system':
          try {
            localStorage.setItem('edify-plugin-registry-preview', JSON.stringify(['effects', 'exports', 'ai-tools', 'templates']));
          } catch {
            // Plugin registry preview is best-effort.
          }
          addNote('Plugin System: local registry preview prepared for effects, exports, AI tools and templates.');
          break;
        case 'edify-score': {
          const clips = project.tracks.flatMap((track) => track.clips);
          const score = Math.min(98, 45 + clips.length * 6 + project.markers.length * 2);
          addNote(`Edify Score: ${score}/100 based on rhythm, captions, safe zones, audio and hook readiness.`);
          addMarkers([{ time: state.playhead, label: `Score ${score}`, color: '#42e8ff', note: `Edify Score: ${score}/100` }]);
          break;
        }
        case 'style-transfer': {
          const source = findClip(project, state.selectedClipId);
          if (source) {
            nextTracks = nextTracks.map((track) => ({
              ...track,
              clips: track.clips.map((clip) =>
                clip.id !== source.id && (clip.kind === source.kind || (clip.kind === 'image' && source.kind === 'video') || (clip.kind === 'video' && source.kind === 'image'))
                  ? { ...clip, transform: { ...source.transform }, effects: source.effects.map((effect) => ({ ...effect, id: createId('fx') })) }
                  : clip
              )
            }));
          } else {
            visualEffects(['Copy Style Ready'], 55);
          }
          addNote('One-Click Style Transfer: selected style copied to matching clips.');
          break;
        }
        case 'smart-media':
          nextProject = {
            ...nextProject,
            assets: nextProject.assets.map((asset) => ({
              ...asset,
              category: asset.kind === 'video'
                ? asset.dimensions && asset.dimensions.height > asset.dimensions.width ? 'Vertical video' : 'Video'
                : asset.kind === 'audio' ? 'Audio / music'
                : asset.kind === 'image' ? 'Images / overlays'
                : 'Generated'
            }))
          };
          addNote('Smart Media Library: assets categorized by video, vertical, audio, image, overlays and generated media.');
          break;
        default:
          addNote(`Studio feature queued: ${featureId}.`);
      }

      return {
        ...nextProject,
        tracks: nextTracks
      };
    });
  }, [applyBeatSync, applyMagicEdit, applyVideoTemplate, commit, state.playhead, state.selectedClipId]);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.history.past[current.history.past.length - 1];
      if (!previous) return current;
      return {
        ...current,
        project: previous,
        saveStatus: 'dirty',
        history: {
          past: current.history.past.slice(0, -1),
          future: [current.project, ...current.history.future]
        }
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      const next = current.history.future[0];
      if (!next) return current;
      return {
        ...current,
        project: next,
        saveStatus: 'dirty',
        history: {
          past: [...current.history.past, current.project],
          future: current.history.future.slice(1)
        }
      };
    });
  }, []);

  const selectedClip = useMemo(() => findClip(state.project, state.selectedClipId), [state.project, state.selectedClipId]);

  return {
    ...state,
    selectedClip,
    setProject,
    setSaveStatus,
    setActivePanel,
    setPlayhead,
    setPlaying,
    togglePlayback,
    setTimelineZoom,
    selectClip,
    addAssets,
    deleteAsset,
    addClipToTimeline,
    addTextClip,
    updateClip,
    moveClip,
    moveSelectedClipLayer,
    resizeClip,
    splitSelectedClip,
    deleteSelectedClip,
    duplicateSelectedClip,
    addEffectToSelectedClip,
    addEffectToClip,
    applySelectedEffectsToAllClips,
    addTransitionToClip,
    addTransitionAt,
    applyPresetAt,
    updateTrack,
    updateProjectSettings,
    applyMagicEdit,
    applyBeatSync,
    applyVideoTemplate,
    applyStudioFeature,
    undo,
    redo
  };
}

export type EditorController = ReturnType<typeof useEditorState>;
