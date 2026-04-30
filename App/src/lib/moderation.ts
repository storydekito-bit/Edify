import type { Clip, ProjectDocument } from '../types/edify';

export type ModerationTone = 'ok' | 'warning' | 'danger' | 'premium';

export type ModerationIssue = {
  id: string;
  title: string;
  detail: string;
  tone: ModerationTone;
  category: 'export' | 'text' | 'audio' | 'copyright' | 'privacy' | 'social' | 'ai' | 'brand';
  premium?: boolean;
};

export type ModerationReport = {
  score: number;
  issues: ModerationIssue[];
  summary: {
    ok: number;
    warning: number;
    danger: number;
    premium: number;
  };
};

export const sensitiveTerms = [
  'insulte',
  'haine',
  'violence',
  'violent',
  'explicite',
  'nsfw',
  'adresse',
  'telephone',
  'téléphone',
  'email',
  'mail',
  'password',
  'mot de passe'
];

const personalInfoPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}\b/,
  /\b\d{1,4}\s+(?:rue|avenue|boulevard|impasse|chemin|route)\b/i
];

export function cleanSensitiveText(text = '') {
  let next = text;
  for (const term of sensitiveTerms) {
    next = next.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '****');
  }
  for (const pattern of personalInfoPatterns) {
    next = next.replace(pattern, '****');
  }
  return next;
}

export function allProjectClips(project: ProjectDocument) {
  return project.tracks.flatMap((track) => track.clips.map((clip) => ({ clip, track })));
}

function clipText(clip: Clip) {
  return `${clip.name} ${clip.text ?? ''} ${clip.effects.map((effect) => effect.name).join(' ')}`.toLowerCase();
}

function hasSensitiveText(clip: Clip) {
  const text = clipText(clip);
  return sensitiveTerms.some((term) => text.includes(term));
}

function hasPersonalInfo(clip: Clip) {
  const text = `${clip.name} ${clip.text ?? ''}`;
  return personalInfoPatterns.some((pattern) => pattern.test(text));
}

function soundLicense(assetName = '', path = '') {
  const key = `${assetName} ${path}`.toLowerCase();
  if (key.includes('edify-sound://') || key.includes('premium') || key.includes('vip')) return 'safe';
  if (/\.(mp3|wav|m4a|aac|flac|ogg|webm)$/.test(key)) return 'check';
  return 'unknown';
}

export function scanProject(project: ProjectDocument): ModerationReport {
  const clips = allProjectClips(project).map((item) => item.clip);
  const textClips = clips.filter((clip) => clip.kind === 'text');
  const visualClips = clips.filter((clip) => clip.kind === 'video' || clip.kind === 'image');
  const audioClips = clips.filter((clip) => clip.kind === 'audio' || clip.kind === 'video');
  const issues: ModerationIssue[] = [];

  if (visualClips.length === 0) {
    issues.push({ id: 'no-visuals', title: 'No visual media', detail: 'Add a video or image before export.', tone: 'danger', category: 'export' });
  } else {
    issues.push({ id: 'visuals-ok', title: 'Visual timeline ready', detail: `${visualClips.length} visual clip${visualClips.length > 1 ? 's' : ''} detected.`, tone: 'ok', category: 'export' });
  }

  if (project.assets.some((asset) => asset.missing)) {
    issues.push({ id: 'missing-media', title: 'Missing media', detail: 'Some imported files need relinking before export.', tone: 'danger', category: 'export' });
  }

  if (textClips.length === 0) {
    issues.push({ id: 'no-captions', title: 'No captions found', detail: 'Add captions for Shorts, Reels, accessibility, and safer publishing.', tone: 'warning', category: 'text' });
  }

  const sensitiveCount = textClips.filter(hasSensitiveText).length;
  if (sensitiveCount > 0) {
    issues.push({ id: 'sensitive-words', title: 'Sensitive words detected', detail: `${sensitiveCount} text/caption layer${sensitiveCount > 1 ? 's' : ''} should be reviewed or censored.`, tone: 'warning', category: 'text' });
  }

  const privacyCount = textClips.filter(hasPersonalInfo).length;
  if (privacyCount > 0) {
    issues.push({ id: 'personal-info', title: 'Personal info possible', detail: `${privacyCount} layer${privacyCount > 1 ? 's' : ''} may contain email, phone, or address data.`, tone: 'danger', category: 'privacy', premium: true });
  }

  const unreadableText = textClips.filter((clip) => clip.transform.scale < 0.5 || clip.transform.opacity < 0.68 || Math.abs(clip.transform.x) > 560 || Math.abs(clip.transform.y) > 370);
  if (unreadableText.length > 0) {
    issues.push({ id: 'text-safe-zone', title: 'Text may be hard to read', detail: `${unreadableText.length} text layer${unreadableText.length > 1 ? 's are' : ' is'} too small, too transparent, or near the edge.`, tone: 'warning', category: 'social' });
  }

  const loudAudio = audioClips.filter((clip) => clip.audio.volume > 1 || clip.audio.denoise < 14);
  if (loudAudio.length > 0) {
    issues.push({ id: 'audio-loudness', title: 'Audio needs polish', detail: `${loudAudio.length} clip${loudAudio.length > 1 ? 's' : ''} may need denoise, fades, or loudness normalization.`, tone: 'warning', category: 'audio', premium: true });
  }

  const externalAudio = project.assets.filter((asset) => asset.kind === 'audio' && soundLicense(asset.name, asset.path) === 'check');
  if (externalAudio.length > 0) {
    issues.push({ id: 'copyright-check', title: 'Copyright check needed', detail: `${externalAudio.length} imported audio file${externalAudio.length > 1 ? 's' : ''} should be verified before publishing.`, tone: 'warning', category: 'copyright', premium: true });
  }

  if (project.settings.aspectRatio !== '9:16') {
    issues.push({ id: 'shorts-format', title: 'Shorts/Reels format', detail: 'Use 9:16 for TikTok, Shorts, and Reels compliance.', tone: 'warning', category: 'social' });
  }

  const firstThreeSeconds = clips.filter((clip) => clip.start < 3);
  if (!firstThreeSeconds.some((clip) => clip.kind === 'text' || clip.effects.length > 0)) {
    issues.push({ id: 'hook-score', title: 'Hook could be stronger', detail: 'No title, caption, or motion effect appears in the first 3 seconds.', tone: 'premium', category: 'ai', premium: true });
  }

  if (project.duration > 60) {
    issues.push({ id: 'short-duration', title: 'Long for short-form', detail: 'The edit is over 60 seconds. Consider a short-form cutdown.', tone: 'warning', category: 'social' });
  }

  if (issues.every((issue) => issue.tone === 'ok')) {
    issues.push({ id: 'publish-ready', title: 'Publish-ready', detail: 'No major export, caption, privacy, or audio risks detected.', tone: 'ok', category: 'export' });
  }

  const summary = {
    ok: issues.filter((issue) => issue.tone === 'ok').length,
    warning: issues.filter((issue) => issue.tone === 'warning').length,
    danger: issues.filter((issue) => issue.tone === 'danger').length,
    premium: issues.filter((issue) => issue.tone === 'premium' || issue.premium).length
  };
  const penalty = summary.danger * 24 + summary.warning * 10 + summary.premium * 5;

  return {
    score: Math.max(0, Math.min(100, 100 - penalty)),
    issues,
    summary
  };
}
