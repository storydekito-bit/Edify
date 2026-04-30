import type { PremiumEffectPreset } from './presets';

export type PremiumAccess = {
  all: boolean;
  packs: string[];
  extras: PremiumExtra[];
  redeemedCodes: string[];
  rewardUnlocks: RewardUnlock[];
  rewardHistory: RewardHistoryEntry[];
  pendingSponsoredClaim: PendingSponsoredClaim | null;
  sponsorSeriesProgress: SponsorSeriesProgress | null;
  lastDailySponsoredUnlockOn: string | null;
};

export type PremiumExtra = 'thumbnail-pro';

export type RewardUnlock = {
  id: string;
  source: 'sponsored';
  itemNames: string[];
  unlockedAt: string;
  expiresAt: string;
  campaignId?: string;
  chosenPack?: string;
};

export type RewardHistoryEntry = {
  id: string;
  source: 'sponsored';
  campaignId?: string;
  chosenPack: string;
  itemNames: string[];
  unlockedAt: string;
  expiresAt: string;
};

export type PendingSponsoredClaim = {
  id: string;
  campaignId: string;
  availablePacks: string[];
  completedAt: string;
  expiresAt: string;
};

export type SponsorSeriesProgress = {
  campaignId: string;
  variantIndex: number;
  secondsLeft: number;
  updatedAt: string;
};

export type PremiumPlan = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  pack?: PremiumEffectPreset['pack'];
  extra?: PremiumExtra;
  all?: boolean;
  badge: string;
  benefits: string[];
  featured?: boolean;
};

export const defaultPremiumAccess: PremiumAccess = {
  all: false,
  packs: [],
  extras: [],
  redeemedCodes: [],
  rewardUnlocks: [],
  rewardHistory: [],
  pendingSponsoredClaim: null,
  sponsorSeriesProgress: null,
  lastDailySponsoredUnlockOn: null
};

export const premiumPlans: PremiumPlan[] = [
  {
    id: 'creator',
    name: 'Creator Pro',
    price: '$4.99',
    cadence: '/ month',
    pack: 'Creator Pro',
    badge: 'Best for shorts',
    benefits: ['Creator glow effects', 'VIP text templates', 'Caption style AI', 'VIP glass transitions']
  },
  {
    id: 'gaming',
    name: 'Gaming Pro',
    price: '$6.99',
    cadence: '/ month',
    pack: 'Gaming Pro',
    badge: 'Motion pack',
    benefits: ['Speed ramp shock', 'Glitch portal transitions', 'Rank-up captions', 'AI hook opener']
  },
  {
    id: 'cinematic',
    name: 'Cinematic Pro',
    price: '$7.99',
    cadence: '/ month',
    pack: 'Cinematic Pro',
    badge: 'Most popular',
    benefits: ['Premium 1440p export', 'Film title cards', 'Anamorphic transitions', 'AI color match'],
    featured: true
  },
  {
    id: 'studio',
    name: 'Studio Max',
    price: '$14.99',
    cadence: '/ month',
    all: true,
    badge: 'Everything',
    benefits: ['4K Ultra export', 'All VIP transitions', 'All VIP text packs', 'All AI edit helpers']
  },
  {
    id: 'text-studio',
    name: 'Text Studio Pass',
    price: '$5.99',
    cadence: '/ month',
    pack: 'Creator Pro',
    badge: 'Titles pack',
    benefits: ['VIP text templates', 'Premium captions', 'Lower thirds pro', 'Text animation vault']
  },
  {
    id: 'ai-creator',
    name: 'AI Creator Pass',
    price: '$9.99',
    cadence: '/ month',
    all: true,
    badge: 'AI tools',
    benefits: ['Smart montage AI', 'Auto hook opener', 'B-roll finder', 'Caption style AI']
  },
  {
    id: 'thumbnail-pro',
    name: 'Thumbnail Pro',
    price: '$6.49',
    cadence: '/ month',
    extra: 'thumbnail-pro',
    badge: 'Cover studio',
    benefits: ['Free transform canvas', 'Pro text placement', 'Manual color tune', 'PNG creator cover workflow']
  },
  {
    id: 'voice-studio-plus',
    name: 'Voice Studio Plus',
    price: '$7.49',
    cadence: '/ month',
    all: true,
    badge: 'Voice tools',
    benefits: ['Denoise and enhance voice', 'Podcast clean chain', 'Auto silence remove', 'Premium voice polish']
  },
  {
    id: 'color-studio-max',
    name: 'Color Studio Max',
    price: '$8.49',
    cadence: '/ month',
    all: true,
    badge: 'Color tools',
    benefits: ['Premium LUT vault', 'Creator skin tone grades', 'Trailer color looks', 'Match-grade helper']
  }
];

const premiumStorageKey = 'edify-premium-access';
const pendingClaimHours = 24;
const legacyCode = (parts: number[]) => String.fromCharCode(...parts);
const removedFreeCodes = [
  legacyCode([70, 82, 69, 69, 45, 69, 68, 73, 70, 89, 50, 51]),
  legacyCode([69, 68, 73, 70, 89, 45, 70, 82, 69, 69]),
  legacyCode([69, 68, 73, 70, 89, 49, 48, 48])
];

export const publicPromoCodes = [
  { code: 'CREATOR50', label: '-50% Creator', detail: 'Creator Pro pack' },
  { code: 'GAMING50', label: '-50% Gaming', detail: 'Gaming Pro pack' },
  { code: 'CINEMA50', label: '-50% Cinema', detail: 'Cinematic Pro pack' },
  { code: 'THUMB50', label: '-50% Thumbnail', detail: 'Thumbnail Pro studio' },
  { code: 'TEXT50', label: '-50% Text', detail: 'VIP text studio' },
  { code: 'SOUND50', label: '-50% Sound', detail: 'VIP sound library' },
  { code: 'EXPORT50', label: '-50% Export', detail: 'Ultra export path' },
  { code: 'LAUNCH70', label: '-70% Launch', detail: 'Studio launch offer' },
  { code: 'STUDENT60', label: '-60% Student', detail: 'Creator student offer' },
  { code: 'SHORTS40', label: '-40% Shorts', detail: 'Short-form creator pack' },
  { code: 'VIP30', label: '-30% VIP', detail: 'All premium trial path' }
];

const promoCodes: Record<string, { name: string; all?: boolean; pack?: PremiumEffectPreset['pack']; extra?: PremiumExtra; discount?: string }> = {
  CINEMA50: { name: 'Cinematic 50% Promo', pack: 'Cinematic Pro', discount: '-50%' },
  GAMING50: { name: 'Gaming 50% Promo', pack: 'Gaming Pro', discount: '-50%' },
  CREATOR50: { name: 'Creator 50% Promo', pack: 'Creator Pro', discount: '-50%' },
  THUMB50: { name: 'Thumbnail 50% Promo', extra: 'thumbnail-pro', discount: '-50%' },
  TEXT50: { name: 'Text Studio 50% Promo', pack: 'Creator Pro', discount: '-50%' },
  SOUND50: { name: 'Sound Library 50% Promo', pack: 'Creator Pro', discount: '-50%' },
  EXPORT50: { name: 'Export 50% Promo', all: true, discount: '-50%' },
  LAUNCH70: { name: 'Launch 70% Promo', all: true, discount: '-70%' },
  STUDENT60: { name: 'Student 60% Promo', pack: 'Creator Pro', discount: '-60%' },
  SHORTS40: { name: 'Shorts 40% Promo', pack: 'Creator Pro', discount: '-40%' },
  VIP30: { name: 'VIP 30% Promo', all: true, discount: '-30%' }
};

function dayKey(now = Date.now()) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function activePendingSponsoredClaim(access: PremiumAccess, now = Date.now()) {
  const pending = access.pendingSponsoredClaim;
  if (!pending) return null;
  return new Date(pending.expiresAt).getTime() > now ? pending : null;
}

export function getPendingSponsoredClaim(access: PremiumAccess, now = Date.now()) {
  return activePendingSponsoredClaim(access, now);
}

export function getRewardHistory(access: PremiumAccess) {
  return [...(access.rewardHistory ?? [])].sort(
    (left, right) => new Date(right.unlockedAt).getTime() - new Date(left.unlockedAt).getTime()
  );
}

export function getSponsorSeriesProgress(access: PremiumAccess) {
  return access.sponsorSeriesProgress ?? null;
}

export function canStartSponsoredUnlockToday(access: PremiumAccess, now = Date.now()) {
  const today = dayKey(now);
  if (activePendingSponsoredClaim(access, now)) return true;
  if (access.sponsorSeriesProgress) return true;
  return access.lastDailySponsoredUnlockOn !== today;
}

export function loadPremiumAccess(): PremiumAccess {
  try {
    const raw = localStorage.getItem(premiumStorageKey);
    const access = raw ? { ...defaultPremiumAccess, ...JSON.parse(raw) } : defaultPremiumAccess;
    const redeemedCodes = access.redeemedCodes.filter((code: string) => !removedFreeCodes.includes(code));
    const hadRemovedFreePass = access.redeemedCodes.length !== redeemedCodes.length;
    const rewardUnlocks = activeRewardUnlocks(access);
    const pendingSponsoredClaim = activePendingSponsoredClaim(access);
    const sanitized = {
      ...access,
      all: hadRemovedFreePass ? false : access.all,
      redeemedCodes,
      extras: Array.isArray(access.extras) ? access.extras : [],
      rewardUnlocks,
      rewardHistory: Array.isArray(access.rewardHistory) ? access.rewardHistory.slice(0, 24) : [],
      pendingSponsoredClaim,
      sponsorSeriesProgress: access.sponsorSeriesProgress ?? null,
      lastDailySponsoredUnlockOn: access.lastDailySponsoredUnlockOn ?? null
    };
    if (
      hadRemovedFreePass
      || rewardUnlocks.length !== access.rewardUnlocks.length
      || pendingSponsoredClaim !== access.pendingSponsoredClaim
    ) savePremiumAccess(sanitized);
    return sanitized;
  } catch {
    return defaultPremiumAccess;
  }
}

export function savePremiumAccess(access: PremiumAccess) {
  localStorage.setItem(premiumStorageKey, JSON.stringify({
    ...access,
    rewardUnlocks: activeRewardUnlocks(access),
    rewardHistory: getRewardHistory(access).slice(0, 24),
    pendingSponsoredClaim: activePendingSponsoredClaim(access),
    sponsorSeriesProgress: access.sponsorSeriesProgress ?? null,
    lastDailySponsoredUnlockOn: access.lastDailySponsoredUnlockOn ?? null
  }));
}

export function activatePremiumPlan(access: PremiumAccess, plan: PremiumPlan): PremiumAccess {
  const nextAccess = {
    all: access.all || Boolean(plan.all),
    packs: plan.pack ? Array.from(new Set([...access.packs, plan.pack])) : access.packs,
    extras: plan.extra ? Array.from(new Set([...(access.extras ?? []), plan.extra])) : (access.extras ?? []),
    redeemedCodes: access.redeemedCodes,
    rewardUnlocks: activeRewardUnlocks(access),
    rewardHistory: access.rewardHistory ?? [],
    pendingSponsoredClaim: activePendingSponsoredClaim(access),
    sponsorSeriesProgress: access.sponsorSeriesProgress ?? null,
    lastDailySponsoredUnlockOn: access.lastDailySponsoredUnlockOn ?? null
  };
  savePremiumAccess(nextAccess);
  return nextAccess;
}

export function redeemPremiumCode(access: PremiumAccess, codeValue: string) {
  const code = codeValue.trim().toUpperCase().replace(/\s+/g, '');
  const promo = promoCodes[code];
  if (!promo) {
    return { ok: false as const, title: 'Code not valid', detail: 'Check the code and try again.', access };
  }
  if (access.redeemedCodes.includes(code)) {
    return { ok: false as const, title: 'Code already used', detail: promo.name, access };
  }
  const nextAccess = {
    all: access.all || Boolean(promo.all),
    packs: promo.pack ? Array.from(new Set([...access.packs, promo.pack])) : access.packs,
    extras: promo.extra ? Array.from(new Set([...(access.extras ?? []), promo.extra])) : (access.extras ?? []),
    redeemedCodes: [...access.redeemedCodes, code],
    rewardUnlocks: activeRewardUnlocks(access),
    rewardHistory: access.rewardHistory ?? [],
    pendingSponsoredClaim: activePendingSponsoredClaim(access),
    sponsorSeriesProgress: access.sponsorSeriesProgress ?? null,
    lastDailySponsoredUnlockOn: access.lastDailySponsoredUnlockOn ?? null
  };
  savePremiumAccess(nextAccess);
  return {
    ok: true as const,
    title: promo.all ? 'All premium active' : `${promo.pack} active`,
    detail: promo.discount ? `${promo.name} applied locally.` : promo.name,
    access: nextAccess
  };
}

export function isPlanActive(access: PremiumAccess, plan: PremiumPlan) {
  return access.all || Boolean(plan.pack && access.packs.includes(plan.pack)) || Boolean(plan.extra && (access.extras ?? []).includes(plan.extra));
}

export function hasAnyPremium(access: PremiumAccess) {
  return access.all || access.packs.length > 0 || (access.extras?.length ?? 0) > 0;
}

export function hasPremiumExtra(access: PremiumAccess, extra: PremiumExtra) {
  return access.all || (access.extras ?? []).includes(extra) || rewardItemNames(access).includes(extra);
}

export function hasThumbnailStudioAccess(access: PremiumAccess) {
  return hasAnyPremium(access) || hasPremiumExtra(access, 'thumbnail-pro');
}

export function hasUltraExport(access: PremiumAccess) {
  return access.all;
}

export function activeRewardUnlocks(access: PremiumAccess, now = Date.now()) {
  return (access.rewardUnlocks ?? []).filter((unlock) => new Date(unlock.expiresAt).getTime() > now);
}

export function rewardItemNames(access: PremiumAccess) {
  return Array.from(new Set(activeRewardUnlocks(access).flatMap((unlock) => unlock.itemNames)));
}

export function hasRewardItem(access: PremiumAccess, itemName: string) {
  return rewardItemNames(access).includes(itemName);
}

export function rewardTimeRemaining(access: PremiumAccess, now = Date.now()) {
  const active = activeRewardUnlocks(access, now);
  if (active.length === 0) return 0;
  return Math.max(...active.map((unlock) => new Date(unlock.expiresAt).getTime() - now));
}

export function saveSponsoredSeriesProgress(access: PremiumAccess, progress: SponsorSeriesProgress | null): PremiumAccess {
  const nextAccess = {
    ...access,
    sponsorSeriesProgress: progress
  };
  savePremiumAccess(nextAccess);
  return nextAccess;
}

export function completeSponsoredSeries(access: PremiumAccess, campaignId: string, availablePacks: string[], now = Date.now()): PremiumAccess {
  const pending: PendingSponsoredClaim = {
    id: `pending-${now}`,
    campaignId,
    availablePacks: Array.from(new Set(availablePacks)),
    completedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + pendingClaimHours * 60 * 60 * 1000).toISOString()
  };
  const nextAccess = {
    ...access,
    pendingSponsoredClaim: pending,
    sponsorSeriesProgress: null,
    lastDailySponsoredUnlockOn: dayKey(now)
  };
  savePremiumAccess(nextAccess);
  return nextAccess;
}

export function activateSponsoredReward(
  access: PremiumAccess,
  itemNames: string[],
  hours = 24,
  meta?: { chosenPack?: string; campaignId?: string; now?: number }
): PremiumAccess {
  const now = meta?.now ?? Date.now();
  const unlock: RewardUnlock = {
    id: `reward-${now}`,
    source: 'sponsored',
    itemNames: Array.from(new Set(itemNames)).slice(0, 5),
    unlockedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + hours * 60 * 60 * 1000).toISOString(),
    campaignId: meta?.campaignId,
    chosenPack: meta?.chosenPack
  };
  const historyEntry: RewardHistoryEntry = {
    id: unlock.id,
    source: 'sponsored',
    campaignId: unlock.campaignId,
    chosenPack: meta?.chosenPack ?? 'Sponsored Trial',
    itemNames: unlock.itemNames,
    unlockedAt: unlock.unlockedAt,
    expiresAt: unlock.expiresAt
  };
  const nextAccess = {
    ...access,
    rewardUnlocks: [unlock, ...activeRewardUnlocks(access)],
    rewardHistory: [historyEntry, ...getRewardHistory(access)].slice(0, 24),
    pendingSponsoredClaim: null,
    sponsorSeriesProgress: null,
    lastDailySponsoredUnlockOn: dayKey(now)
  };
  savePremiumAccess(nextAccess);
  return nextAccess;
}
