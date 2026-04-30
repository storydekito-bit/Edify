import type { MediaAsset } from '../types/edify';

type SoundSeed = {
  name: string;
  duration: number;
  tag: string;
};

type SoundProfile = {
  mode: 'ambient' | 'beat' | 'impact' | 'riser' | 'glitch' | 'ui' | 'logo';
  brightness: number;
  density: number;
  wobble: number;
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function pseudoNoise(index: number, seed: number) {
  const x = Math.sin((index + 1) * 12.9898 + seed * 0.00137) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function frequencyForName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('impact')) return 74;
  if (lower.includes('drop')) return 58;
  if (lower.includes('riser')) return 220;
  if (lower.includes('glitch')) return 310;
  if (lower.includes('click')) return 880;
  if (lower.includes('ambience')) return 132;
  if (lower.includes('lofi')) return 196;
  if (lower.includes('house')) return 124;
  if (lower.includes('trap') || lower.includes('drill')) return 98;
  if (lower.includes('piano')) return 262;
  if (lower.includes('ambient') || lower.includes('pad') || lower.includes('drone')) return 110;
  if (lower.includes('gaming') || lower.includes('cyber') || lower.includes('synth')) return 164;
  return 420;
}

function isMusicName(name: string) {
  const lower = name.toLowerCase();
  return [
    'loop',
    'beat',
    'bed',
    'pulse',
    'piano',
    'groove',
    'ambient',
    'pad',
    'drone',
    'house',
    'trap',
    'drill',
    'lofi',
    'vlog',
    'montage',
    'intro',
    'pop',
    'synth',
    'wave',
    'documentary',
    'startup'
  ].some((token) => lower.includes(token));
}

function tempoForName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('lofi') || lower.includes('study') || lower.includes('ambient') || lower.includes('pad')) return 76;
  if (lower.includes('trap') || lower.includes('drill') || lower.includes('gaming') || lower.includes('hyper')) return 142;
  if (lower.includes('house') || lower.includes('workout')) return 124;
  if (lower.includes('cinematic') || lower.includes('trailer') || lower.includes('suspense')) return 92;
  return 104;
}

function profileForSound(name: string, tag: string): SoundProfile {
  const lower = `${name} ${tag}`.toLowerCase();
  if (/logo|chime|sting|brand/.test(lower)) return { mode: 'logo', brightness: 0.9, density: 0.42, wobble: 0.18 };
  if (/ui|click|tap/.test(lower)) return { mode: 'ui', brightness: 1.1, density: 0.24, wobble: 0.08 };
  if (/glitch|arcade|cyber/.test(lower)) return { mode: 'glitch', brightness: 0.84, density: 0.76, wobble: 0.42 };
  if (/impact|boom|hit|drop|flash/.test(lower)) return { mode: 'impact', brightness: 0.52, density: 0.88, wobble: 0.14 };
  if (/riser|build|sweep|whoosh|transition/.test(lower)) return { mode: 'riser', brightness: 0.76, density: 0.68, wobble: 0.36 };
  if (/ambient|pad|drone|calm|meditation|rain|space/.test(lower)) return { mode: 'ambient', brightness: 0.46, density: 0.52, wobble: 0.48 };
  return { mode: 'beat', brightness: 0.66, density: 0.66, wobble: 0.22 };
}

export function createWaveformForName(name: string, bars = 28) {
  const lower = name.toLowerCase();
  const seed = Array.from(name).reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 17);
  const isSoft = /chill|lofi|soft|calm|study|rainy|warm|morning|piano|ambient|meditation|vlog|beach|cozy|dream|sunset|coffee|cloud|breeze|acoustic|happy|cute/i.test(lower);
  const isHit = /hit|impact|boom|drop|flash|riser|glitch|trailer|suspense|drill|trap/i.test(lower);
  return Array.from({ length: bars }, (_, index) => {
    const phase = (index + 1) / bars;
    const randomish = Math.abs(Math.sin((seed + index * 31.7) * 0.137));
    const pulse = Math.abs(Math.sin(phase * Math.PI * (isHit ? 8 : isSoft ? 3 : 5)));
    const envelope = isHit ? Math.max(0.18, 1 - phase * 0.72) : isSoft ? 0.42 + pulse * 0.32 : 0.34 + pulse * 0.48;
    const value = Math.round((0.18 + envelope * 0.68 + randomish * (isSoft ? 0.12 : 0.22)) * 100);
    return Math.max(12, Math.min(100, value));
  });
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

export function createGeneratedSoundDataUrl({ name, duration, tag }: SoundSeed) {
  const sampleRate = 22050;
  const seconds = Math.max(0.25, Math.min(duration, 16));
  const samples = Math.floor(sampleRate * seconds);
  const bytesPerSample = 2;
  const dataSize = samples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const lower = name.toLowerCase();
  const seed = hashString(`${name}:${tag}`);
  const base = frequencyForName(name);
  const musical = isMusicName(name);
  const tempo = tempoForName(name);
  const profile = profileForSound(name, tag);
  const beatLength = 60 / tempo;
  const chordRatios = [1, 1.125, 1.2, 1.25, 1.333, 1.5, 1.667, 1.875];
  const modulationRate = 0.14 + (seed % 7) * 0.03;
  const subFrequency = Math.max(34, base * (0.28 + (seed % 5) * 0.04));

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < samples; index += 1) {
    const t = index / sampleRate;
    const progress = t / seconds;
    const attack = Math.min(1, progress / (musical ? 0.025 : profile.mode === 'impact' ? 0.012 : 0.06));
    const release = Math.min(1, (1 - progress) / (musical ? 0.42 : profile.mode === 'ambient' ? 0.55 : 0.22));
    const envelope = Math.max(0, Math.min(attack, release));
    const beat = t / beatLength;
    const beatPhase = beat % 1;
    const step = Math.floor(beat * 2) % chordRatios.length;
    const chord = chordRatios[step];
    const wobble = 1 + Math.sin(Math.PI * 2 * modulationRate * t) * profile.wobble;
    const sweep =
      profile.mode === 'riser'
        ? base + progress * (540 + (seed % 180))
        : lower.includes('whoosh')
          ? base + Math.sin(progress * Math.PI) * 240
          : base * wobble;
    const noise = pseudoNoise(index, seed) * (0.08 + profile.density * 0.18);
    const kick = Math.exp(-beatPhase * (18 + profile.density * 8)) * Math.sin(Math.PI * 2 * (subFrequency + base * 0.05) * t);
    const snarePhase = (beat + 0.5) % 1;
    const snare = Math.exp(-snarePhase * (20 + profile.brightness * 10)) * noise;
    const hat = Math.exp(-((beat * 4) % 1) * 42) * Math.sign(Math.sin(Math.PI * 2 * (5800 + profile.brightness * 2200) * t));
    const pad =
      Math.sin(Math.PI * 2 * base * chord * 0.5 * t) * (0.18 + profile.density * 0.1) +
      Math.sin(Math.PI * 2 * base * chord * 0.75 * t) * 0.14 +
      Math.sin(Math.PI * 2 * base * chord * (1.2 + profile.brightness * 0.18) * t) * 0.1;
    const leadGate = beatPhase < 0.52 ? 1 : 0.24 + profile.density * 0.22;
    const lead =
      Math.sin(Math.PI * 2 * base * chord * (1.8 + profile.brightness * 0.6) * t) * 0.16 * leadGate +
      Math.sign(Math.sin(Math.PI * 2 * base * chord * 1.01 * t)) * 0.04 * profile.brightness * leadGate;
    const shimmer = Math.sin(Math.PI * 2 * base * chord * (2.4 + profile.brightness) * t) * 0.06;
    const groove =
      pad +
      lead +
      shimmer +
      (profile.mode === 'ambient' || lower.includes('pad') || lower.includes('drone') ? 0 : kick * 0.48 + snare * 0.22 + hat * 0.05);
    const sfxBase =
      Math.sin(Math.PI * 2 * sweep * t) * 0.42 +
      Math.sin(Math.PI * 2 * sweep * (1.45 + profile.brightness * 0.18) * t) * 0.2 +
      Math.sin(Math.PI * 2 * sweep * 0.5 * t) * 0.14;
    const impactBody = (profile.mode === 'impact' ? Math.sin(Math.PI * 2 * (34 + subFrequency * 0.4) * t) * (1 - progress) * 0.42 : 0);
    const glitchGate = profile.mode === 'glitch' ? Math.sign(Math.sin(Math.PI * 2 * (14 + (seed % 8)) * t)) * 0.22 : 0;
    const riserAir = profile.mode === 'riser' ? Math.sin(Math.PI * 2 * (sweep * 0.22 + 1800 * progress) * t) * 0.1 : 0;
    const logoChime = profile.mode === 'logo' ? (Math.sin(Math.PI * 2 * base * 2 * t) + Math.sin(Math.PI * 2 * base * 3.01 * t) * 0.6) * 0.16 : 0;
    const uiPing = profile.mode === 'ui' ? Math.sin(Math.PI * 2 * (base * 1.8 + 480) * t) * Math.exp(-progress * 9) * 0.32 : 0;
    const ambientDrift = profile.mode === 'ambient' ? (pad * 0.72 + shimmer * 0.8 + noise * 0.35) : 0;
    const sfx = sfxBase + impactBody + glitchGate + riserAir + logoChime + uiPing + ambientDrift + noise;
    const wave = musical
      ? groove + noise * 0.02 + (profile.mode === 'beat' ? Math.sin(Math.PI * 2 * subFrequency * t) * 0.08 : 0)
      : sfx;
    view.setInt16(44 + index * bytesPerSample, Math.max(-1, Math.min(1, wave * envelope)) * 0x7fff, true);
  }

  return `data:audio/wav;base64,${bytesToBase64(new Uint8Array(buffer))}`;
}

export function createGeneratedSoundAsset(sound: SoundSeed): MediaAsset {
  return {
    id: `sound-${sound.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    name: sound.name,
    kind: 'audio',
    path: `edify-sound://${sound.name}`,
    previewUrl: createGeneratedSoundDataUrl(sound),
    extension: sound.tag === 'Music' ? 'LOOP' : 'SFX',
    duration: sound.duration,
    waveform: createWaveformForName(sound.name),
    importedAt: new Date().toISOString(),
    category: sound.tag
  };
}
