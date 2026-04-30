import type { Clip, MediaAsset, ProjectDocument, Track } from '../types/edify';
import { createId } from '../lib/id';

const now = new Date().toISOString();

function clip(partial: Partial<Clip> & Pick<Clip, 'trackId' | 'kind' | 'name' | 'start' | 'duration' | 'color'>): Clip {
  return {
    id: createId('clip'),
    inPoint: 0,
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
    keyframes: [],
    ...partial
  };
}

export function createDemoProject(name = 'Untitled Edit'): ProjectDocument {
  const mediaTrack = createId('track');
  const overlayTrack = createId('track');
  const textTrack = createId('track');
  const audioTrack = createId('track');

  const assets: MediaAsset[] = [
    {
      id: 'asset-neon-city',
      name: 'Neon city push in.mp4',
      kind: 'video',
      path: 'demo://neon-city',
      thumbnailUrl: './demo-assets/neon-city.svg',
      duration: 12,
      importedAt: now,
      extension: 'MP4',
      size: 128000000,
      dimensions: { width: 3840, height: 2160 },
      category: 'Demo Footage',
      favorite: true
    },
    {
      id: 'asset-studio',
      name: 'Studio product orbit.mov',
      kind: 'video',
      path: 'demo://studio-orbit',
      thumbnailUrl: './demo-assets/studio-orbit.svg',
      duration: 9,
      importedAt: now,
      extension: 'MOV',
      size: 94000000,
      dimensions: { width: 1920, height: 1080 },
      category: 'Demo Footage'
    },
    {
      id: 'asset-beat',
      name: 'Midnight pulse.wav',
      kind: 'audio',
      path: 'demo://midnight-pulse',
      thumbnailUrl: './demo-assets/waveform.svg',
      duration: 34,
      importedAt: now,
      extension: 'WAV',
      size: 44000000,
      category: 'Music'
    },
    {
      id: 'asset-overlay',
      name: 'Glass flare overlay.png',
      kind: 'image',
      path: 'demo://glass-flare',
      thumbnailUrl: './demo-assets/glass-flare.svg',
      duration: 8,
      importedAt: now,
      extension: 'PNG',
      size: 2100000,
      dimensions: { width: 1920, height: 1080 },
      category: 'Overlays'
    }
  ];

  const tracks: Track[] = [
    {
      id: overlayTrack,
      name: 'Overlays',
      kind: 'overlay',
      height: 52,
      color: '#9f7cff',
      clips: [
        clip({
          trackId: overlayTrack,
          assetId: 'asset-overlay',
          kind: 'image',
          name: 'Glass flare',
          start: 5.2,
          duration: 7,
          color: '#9f7cff',
          transform: { x: 0, y: -4, scale: 1.04, rotation: 0, opacity: 0.52 },
          effects: [{ id: createId('fx'), name: 'Glow', kind: 'glow', enabled: true, intensity: 38 }]
        })
      ]
    },
    {
      id: textTrack,
      name: 'Text',
      kind: 'text',
      height: 56,
      color: '#42e8ff',
      clips: [
        clip({
          trackId: textTrack,
          kind: 'text',
          name: 'Cinematic title',
          start: 1.2,
          duration: 4.5,
          color: '#42e8ff',
          text: 'EDIFY SHOWREEL',
          effects: [{ id: createId('fx'), name: 'Neon Title', kind: 'text-animation', enabled: true, intensity: 72 }]
        }),
        clip({
          trackId: textTrack,
          kind: 'text',
          name: 'Lower third',
          start: 8.1,
          duration: 4.8,
          color: '#58ffb0',
          text: 'Local-first editor prototype'
        })
      ]
    },
    {
      id: mediaTrack,
      name: 'Video 1',
      kind: 'video',
      height: 68,
      color: '#2e83ff',
      clips: [
        clip({
          trackId: mediaTrack,
          assetId: 'asset-neon-city',
          kind: 'video',
          name: 'Neon city push in',
          start: 0,
          duration: 7.6,
          color: '#2e83ff',
          effects: [
            { id: createId('fx'), name: 'Cinematic Cool Tone', kind: 'filter', enabled: true, intensity: 64 },
            { id: createId('fx'), name: 'Vignette', kind: 'vignette', enabled: true, intensity: 22 }
          ],
          keyframes: [
            { id: createId('kf'), time: 0, property: 'scale', value: 1 },
            { id: createId('kf'), time: 7.6, property: 'scale', value: 1.08 }
          ]
        }),
        clip({
          trackId: mediaTrack,
          assetId: 'asset-studio',
          kind: 'video',
          name: 'Studio product orbit',
          start: 7.6,
          duration: 8.4,
          color: '#6f7dff',
          transition: { style: 'Whip', easing: 'Cubic out' },
          effects: [{ id: createId('fx'), name: 'Contrast Boost', kind: 'filter', enabled: true, intensity: 46 }]
        })
      ]
    },
    {
      id: audioTrack,
      name: 'Music',
      kind: 'audio',
      height: 58,
      color: '#21d19f',
      clips: [
        clip({
          trackId: audioTrack,
          assetId: 'asset-beat',
          kind: 'audio',
          name: 'Midnight pulse',
          start: 0,
          duration: 16,
          color: '#21d19f',
          audio: { volume: 0.76, fadeIn: 0.8, fadeOut: 1.2, pitch: 0, denoise: 12 }
        })
      ]
    }
  ];

  return {
    id: createId('project'),
    name,
    thumbnail: './demo-assets/neon-city.svg',
    createdAt: now,
    updatedAt: now,
    settings: {
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      aspectRatio: '16:9',
      backgroundColor: '#05060a',
      sampleRate: 48000
    },
    assets,
    tracks,
    markers: [
      { id: createId('marker'), time: 1.2, label: 'Title hit', color: '#42e8ff', note: 'Let the title breathe.' },
      { id: createId('marker'), time: 7.6, label: 'Whip cut', color: '#9f7cff', note: 'Beat cut candidate.' },
      { id: createId('marker'), time: 12.8, label: 'Export loop end', color: '#58ffb0' }
    ],
    notes: 'Starter project: premium cinematic reel with text, effects, audio, markers, and a transition.',
    duration: 16,
    version: 1
  };
}
