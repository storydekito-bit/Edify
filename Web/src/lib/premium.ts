import type { PremiumEffectPreset } from './presets';

export type PremiumAccess = {
  all: boolean;
  packs: string[];
  redeemedCodes: string[];
  rewardUnlocks: RewardUnlock[];
};

export type RewardUnlock = {
  id: string;
  source: 'sponsored';
  itemNames: string[];
  unlockedAt: string;
  expiresAt: string;
};

export type PremiumPlan = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  pack?: PremiumEffectPreset['pack'];
  all?: boolean;
  badge: string;
  benefits: string[];
  featured?: boolean;
};

export const defaultPremiumAccess: PremiumAccess = {
  all: false,
  packs: [],
  redeemedCodes: [],
  rewardUnlocks: []
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
  }
];

const premiumStorageKey = 'edify-premium-access';
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
  { code: 'TEXT50', label: '-50% Text', detail: 'VIP text studio' },
  { code: 'SOUND50', label: '-50% Sound', detail: 'VIP sound library' },
  { code: 'EXPORT50', label: '-50% Export', detail: 'Ultra export path' },
  { code: 'LAUNCH70', label: '-70% Launch', detail: 'Studio launch offer' },
  { code: 'STUDENT60', label: '-60% Student', detail: 'Creator student offer' },
  { code: 'SHORTS40', label: '-40% Shorts', detail: 'Short-form creator pack' },
  { code: 'VIP30', label: '-30% VIP', detail: 'All premium trial path' }
];

const promoCodes: Record<string, { name: string; all?: boolean; pack?: PremiumEffectPreset['pack']; discount?: string }> = {
  CINEMA50: { name: 'Cinematic 50% Promo', pack: 'Cinematic Pro', discount: '-50%' },
  GAMING50: { name: 'Gaming 50% Promo', pack: 'Gaming Pro', discount: '-50%' },
  CREATOR50: { name: 'Creator 50% Promo', pack: 'Creator Pro', discount: '-50%' },
  TEXT50: { name: 'Text Studio 50% Promo', pack: 'Creator Pro', discount: '-50%' },
  SOUND50: { name: 'Sound Library 50% Promo', pack: 'Creator Pro', discount: '-50%' },
  EXPORT50: { name: 'Export 50% Promo', all: true, discount: '-50%' },
  LAUNCH70: { name: 'Launch 70% Promo', all: true, discount: '-70%' },
  STUDENT60: { name: 'Student 60% Promo', pack: 'Creator Pro', discount: '-60%' },
  SHORTS40: { name: 'Shorts 40% Promo', pack: 'Creator Pro', discount: '-40%' },
  VIP30: { name: 'VIP 30% Promo', all: true, discount: '-30%' }
};

export function loadPremiumAccess(): PremiumAccess {
  try {
    const raw = localStorage.getItem(premiumStorageKey);
    const access = raw ? { ...defaultPremiumAccess, ...JSON.parse(raw) } : defaultPremiumAccess;
    const redeemedCodes = access.redeemedCodes.filter((code: string) => !removedFreeCodes.includes(code));
    const hadRemovedFreePass = access.redeemedCodes.length !== redeemedCodes.length;
    const rewardUnlocks = activeRewardUnlocks(access);
    const sanitized = {
      ...access,
      all: hadRemovedFreePass ? false : access.all,
      redeemedCodes,
      rewardUnlocks
    };
    if (hadRemovedFreePass || rewardUnlocks.length !== access.rewardUnlocks.length) savePremiumAccess(sanitized);
    return sanitized;
  } catch {
    return defaultPremiumAccess;
  }
}

export function savePremiumAccess(access: PremiumAccess) {
  localStorage.setItem(premiumStorageKey, JSON.stringify({ ...access, rewardUnlocks: activeRewardUnlocks(access) }));
}

export function activatePremiumPlan(access: PremiumAccess, plan: PremiumPlan): PremiumAccess {
  const nextAccess = {
    all: access.all || Boolean(plan.all),
    packs: plan.pack ? Array.from(new Set([...access.packs, plan.pack])) : access.packs,
    redeemedCodes: access.redeemedCodes,
    rewardUnlocks: activeRewardUnlocks(access)
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
    redeemedCodes: [...access.redeemedCodes, code],
    rewardUnlocks: activeRewardUnlocks(access)
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
  return access.all || Boolean(plan.pack && access.packs.includes(plan.pack));
}

export function hasAnyPremium(access: PremiumAccess) {
  return access.all || access.packs.length > 0;
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

export function activateSponsoredReward(access: PremiumAccess, itemNames: string[], hours = 24): PremiumAccess {
  const now = Date.now();
  const unlock: RewardUnlock = {
    id: `reward-${now}`,
    source: 'sponsored',
    itemNames: Array.from(new Set(itemNames)).slice(0, 5),
    unlockedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + hours * 60 * 60 * 1000).toISOString()
  };
  const nextAccess = {
    ...access,
    rewardUnlocks: [unlock, ...activeRewardUnlocks(access)]
  };
  savePremiumAccess(nextAccess);
  return nextAccess;
}
