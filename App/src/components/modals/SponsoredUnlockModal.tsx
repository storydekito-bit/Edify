import { CheckCircle2, Crown, Sparkles, Timer, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  activateSponsoredReward,
  canStartSponsoredUnlockToday,
  completeSponsoredSeries,
  getPendingSponsoredClaim,
  getSponsorSeriesProgress,
  saveSponsoredSeriesProgress,
  type PremiumAccess
} from '../../lib/premium';
import type { PremiumEffectPreset } from '../../lib/presets';
import type { Toast } from '../../types/edify';

type SponsoredUnlockModalProps = {
  access: PremiumAccess;
  candidates: PremiumEffectPreset[];
  onAccessChange: (access: PremiumAccess) => void;
  onClose: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

const adVariants = [
  {
    id: 'premium-core',
    duration: 30,
    theme: 'variant-premium',
    rail: ['Effects', 'Captions', 'Transitions', 'Exports'],
    scenes: [
      { kicker: 'Meet Edify Premium', title: 'Edit faster. Look sharper.', detail: 'Premium effects, titles, transitions, captions, and export helpers built for creators.', chips: ['Creator Pro', 'Gaming Pro', 'Cinematic Pro'] },
      { kicker: 'Creator packs', title: 'Make every clip feel finished', detail: 'Glow, skin light, clean titles, kinetic captions, lower thirds, and polished social looks.', chips: ['VIP captions', 'Creator glow', 'Text studio'] },
      { kicker: 'Motion energy', title: 'Transitions that actually sell the cut', detail: 'Glass wipes, zoom warps, glitch portals, whip cuts, impact flashes, and smooth motion punch.', chips: ['Transition vault', 'Speed ramp', 'Beat cuts'] },
      { kicker: 'Reward reveal', title: 'Your trial pack is almost ready', detail: 'When the reel ends, Edify unlocks 5 random base premium items on this device.', chips: ['Sponsored unlock', 'Local access', 'Creator friendly'] }
    ]
  },
  {
    id: 'creator-flow',
    duration: 20,
    theme: 'variant-creator',
    rail: ['Texts', 'Brand kits', 'Hooks', 'Templates'],
    scenes: [
      { kicker: 'Creator flow', title: 'Ship polished edits faster', detail: 'Build shorts, reels, vlogs, and launch videos with cleaner packs and sharper presets.', chips: ['Hook titles', 'Clean captions', 'Brand looks'] },
      { kicker: 'Faster social output', title: 'Less setup. More finished videos.', detail: 'Use ready-made text systems, creator presets, and smoother social export helpers.', chips: ['Shorts pack', 'YouTube ready', 'Fast overlays'] },
      { kicker: 'Style unlock', title: 'Try the creator stack for a full day', detail: 'Watch the sponsor reel, pick a style, and preview premium tools before committing.', chips: ['24h access', 'No clutter', 'Workflow boost'] }
    ]
  },
  {
    id: 'sound-motion',
    duration: 15,
    theme: 'variant-sound',
    rail: ['Whooshes', 'Beats', 'Impacts', 'Mix'],
    scenes: [
      { kicker: 'Sound and motion', title: 'Give every cut more energy', detail: 'Risers, impacts, transitions, beat helpers, and cleaner audio polish in one motion stack.', chips: ['Impact hits', 'Riser vault', 'Beat sync'] },
      { kicker: 'Quick premium preview', title: 'A short reel. A real reward.', detail: 'This faster sponsor unlock gives you a compact premium preview flow with motion-first picks.', chips: ['Fast sponsor', 'Motion pass', 'Sound upgrade'] }
    ]
  }
];

const rewardStyles = [
  {
    id: 'Creator Pro',
    name: 'Creator',
    detail: 'Captions, glow, clean titles, creator polish.',
    accent: 'creator'
  },
  {
    id: 'Gaming Pro',
    name: 'Gaming',
    detail: 'Glitch, speed, impact, punchy motion.',
    accent: 'gaming'
  },
  {
    id: 'Cinematic Pro',
    name: 'Cinematic',
    detail: 'Film looks, smooth transitions, trailer tone.',
    accent: 'cinematic'
  }
];

function pickRewardItems(candidates: PremiumEffectPreset[], pack?: string) {
  const unique = Array.from(new Map(candidates.map((item) => [item.name, item])).values());
  const pool = pack ? unique.filter((item) => item.pack === pack) : unique;
  const keywords: Record<string, string[]> = {
    'Creator Pro': ['caption', 'title', 'creator', 'clean', 'glow', 'skin', 'lower'],
    'Gaming Pro': ['glitch', 'impact', 'zoom', 'speed', 'shock', 'gaming', 'portal', 'flash'],
    'Cinematic Pro': ['film', 'cinematic', 'glass', 'warm', 'cool', 'trail', 'fog', 'halation', 'anamorphic']
  };
  const preferred = pack
    ? pool.filter((item) => keywords[pack]?.some((keyword) => item.name.toLowerCase().includes(keyword)))
    : pool;
  const source = preferred.length >= 5 ? preferred : pool;
  return source
    .map((item) => ({ item, score: Math.random() }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(({ item }) => item);
}

function useSponsorMusic(enabled: boolean, variantId: string) {
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    contextRef.current = context;
    const master = context.createGain();
    master.gain.value = variantId === 'sound-motion' ? 0.04 : variantId === 'creator-flow' ? 0.028 : 0.032;
    master.connect(context.destination);
    const presets = {
      'premium-core': {
        notes: [261.63, 329.63, 392, 493.88, 440, 392, 329.63, 293.66],
        interval: 430,
        primary: 'triangle' as OscillatorType,
        secondary: 'sine' as OscillatorType,
        filter: 950,
        bassEvery: 4
      },
      'creator-flow': {
        notes: [329.63, 392, 523.25, 587.33, 523.25, 392, 349.23, 293.66],
        interval: 360,
        primary: 'sine' as OscillatorType,
        secondary: 'triangle' as OscillatorType,
        filter: 1400,
        bassEvery: 6
      },
      'sound-motion': {
        notes: [164.81, 220, 246.94, 329.63, 220, 196, 174.61, 220],
        interval: 280,
        primary: 'sawtooth' as OscillatorType,
        secondary: 'triangle' as OscillatorType,
        filter: 780,
        bassEvery: 2
      }
    } as const;
    const preset = presets[variantId as keyof typeof presets] ?? presets['premium-core'];
    let step = 0;

    const playNote = () => {
      const now = context.currentTime;
      const note = preset.notes[step % preset.notes.length];
      const osc = context.createOscillator();
      const tone = context.createGain();
      const filter = context.createBiquadFilter();
      osc.type = step % 4 === 0 ? preset.primary : preset.secondary;
      osc.frequency.value = note;
      filter.type = 'lowpass';
      filter.frequency.value = preset.filter;
      tone.gain.setValueAtTime(0.0001, now);
      tone.gain.exponentialRampToValueAtTime(0.55, now + 0.03);
      tone.gain.exponentialRampToValueAtTime(0.0001, now + (preset.interval / 1000) * 0.92);
      osc.connect(filter);
      filter.connect(tone);
      tone.connect(master);
      osc.start(now);
      osc.stop(now + (preset.interval / 1000) * 1.05);

      if (step % preset.bassEvery === 0) {
        const bass = context.createOscillator();
        const bassGain = context.createGain();
        bass.type = 'sine';
        bass.frequency.value = note / 2;
        bassGain.gain.setValueAtTime(0.0001, now);
        bassGain.gain.exponentialRampToValueAtTime(0.32, now + 0.04);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.54, preset.interval / 1000));
        bass.connect(bassGain);
        bassGain.connect(master);
        bass.start(now);
        bass.stop(now + Math.max(0.58, (preset.interval / 1000) * 1.3));
      }

      step += 1;
    };

    void context.resume().catch(() => undefined);
    playNote();
    const interval = window.setInterval(playNote, preset.interval);
    return () => {
      window.clearInterval(interval);
      void context.close().catch(() => undefined);
      contextRef.current = null;
    };
  }, [enabled, variantId]);
}

export function SponsoredUnlockModal({ access, candidates, onAccessChange, onClose, pushToast }: SponsoredUnlockModalProps) {
  const campaignId = 'sponsor-series-v2';
  const initialPending = getPendingSponsoredClaim(access);
  const rawInitialProgress = getSponsorSeriesProgress(access);
  const initialProgress = rawInitialProgress?.campaignId === campaignId ? rawInitialProgress : null;
  const [variantIndex, setVariantIndex] = useState(initialPending ? adVariants.length - 1 : (initialProgress?.variantIndex ?? 0));
  const variant = adVariants[variantIndex];
  const [secondsLeft, setSecondsLeft] = useState(initialPending ? 0 : (initialProgress?.secondsLeft ?? variant.duration));
  const [rewardItems, setRewardItems] = useState<PremiumEffectPreset[]>([]);
  const [claimed, setClaimed] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [pendingClaim, setPendingClaim] = useState(initialPending);
  const elapsed = variant.duration - secondsLeft;
  const sceneIndex = Math.min(variant.scenes.length - 1, Math.floor((elapsed / variant.duration) * variant.scenes.length));
  const scene = variant.scenes[sceneIndex];
  const watchedBeforeCurrent = adVariants.slice(0, variantIndex).reduce((total, item) => total + item.duration, 0);
  const totalDuration = adVariants.reduce((total, item) => total + item.duration, 0);
  const totalElapsed = watchedBeforeCurrent + elapsed;
  const progress = Math.round((totalElapsed / totalDuration) * 100);
  const readyForChoice = variantIndex === adVariants.length - 1 && secondsLeft === 0 && !claimed;
  const currentStageComplete = secondsLeft === 0;
  useSponsorMusic(musicEnabled && !claimed, variant.id);

  const requestClose = () => {
    if (readyForChoice && !claimed) {
      const nextAccess = pendingClaim
        ? access
        : completeSponsoredSeries(access, campaignId, rewardStyles.map((style) => style.id));
      setPendingClaim(getPendingSponsoredClaim(nextAccess));
      onAccessChange(nextAccess);
      pushToast({
        title: 'Reward saved for later',
        detail: 'Your sponsored reward was locked safely. You can come back later and choose Creator, Gaming, or Cinematic.',
        tone: 'info'
      });
      onClose();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (pendingClaim || claimed) return;
    if (!canStartSponsoredUnlockToday(access) && !initialProgress) {
      pushToast({
        title: 'Daily unlock already used',
        detail: 'Come back tomorrow for another sponsored reward series.',
        tone: 'warning'
      });
      onClose();
    }
  }, [access, claimed, initialProgress, onClose, pendingClaim, pushToast]);

  useEffect(() => {
    if (pendingClaim || claimed) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [claimed, pendingClaim, variantIndex]);

  useEffect(() => {
    if (claimed || pendingClaim) return;
    saveSponsoredSeriesProgress(access, {
      campaignId,
      variantIndex,
      secondsLeft,
      updatedAt: new Date().toISOString()
    });
  }, [access, campaignId, claimed, pendingClaim, secondsLeft, variantIndex]);

  useEffect(() => {
    if (secondsLeft > 0 || claimed) return;
    if (variantIndex >= adVariants.length - 1) return;
    const nextTimer = window.setTimeout(() => {
      setVariantIndex((current) => current + 1);
      setSecondsLeft(adVariants[variantIndex + 1].duration);
    }, 850);
    return () => window.clearTimeout(nextTimer);
  }, [claimed, secondsLeft, variantIndex]);

  useEffect(() => {
    if (!readyForChoice || claimed || pendingClaim) return;
    const nextAccess = completeSponsoredSeries(access, campaignId, rewardStyles.map((style) => style.id));
    setPendingClaim(getPendingSponsoredClaim(nextAccess));
    onAccessChange(nextAccess);
  }, [access, campaignId, claimed, onAccessChange, pendingClaim, readyForChoice]);

  const claimStyle = (pack: string) => {
    const selectedItems = pickRewardItems(candidates, pack);
    const nextAccess = activateSponsoredReward(access, selectedItems.map((item) => item.name), 24, {
      chosenPack: pack,
      campaignId
    });
    setRewardItems(selectedItems);
    setClaimed(true);
    setPendingClaim(null);
    setMusicEnabled(false);
    onAccessChange(nextAccess);
    pushToast({
      title: `${pack} trial unlocked`,
      detail: `${selectedItems.length} premium items are available for 24 hours.`,
      tone: 'success'
    });
  };

  return (
    <div className="modal-scrim sponsored-unlock-scrim">
      <section className="modal sponsored-unlock-modal">
        <header className="sponsored-unlock-header">
          <div>
            <span className="premium-offer-kicker"><Sparkles size={14} /> Sponsored Trial</span>
            <h2>Try premium tools for 24 hours</h2>
            <p>Watch all 3 sponsor clips to unlock 5 random base premium items for your current device. Progress is saved if you leave, and the final reward can be claimed later from your locker.</p>
          </div>
          <div className="sponsored-header-actions">
            <button className="icon-button" onClick={() => setMusicEnabled((current) => !current)} title={musicEnabled ? 'Mute music' : 'Play music'}>
              {musicEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button className="icon-button" onClick={requestClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="sponsored-step-track">
          {adVariants.map((item, index) => (
            <div
              key={item.id}
              className={`sponsored-step-pill ${index < variantIndex || (index === variantIndex && currentStageComplete) || pendingClaim ? 'is-done' : ''} ${index === variantIndex && !currentStageComplete && !pendingClaim ? 'is-live' : ''}`}
            >
              <strong>Ad {index + 1}</strong>
              <span>{item.duration}s</span>
            </div>
          ))}
        </div>

        <div className={`sponsored-ad-stage ${variant.theme} scene-${sceneIndex}`}>
          <div className="sponsored-ad-orbit">
            <span /><span /><span />
          </div>
          <div className="sponsored-ad-product">
            <div className="sponsored-ad-logo">
              <Crown size={26} />
              <strong>EDIFY</strong>
            </div>
            <div className="sponsored-scene-copy" key={scene.title}>
              <small>{scene.kicker}</small>
              <h3>{scene.title}</h3>
              <p>{scene.detail}</p>
            </div>
          </div>
          {readyForChoice ? (
            <div className="reward-choice-grid">
              {rewardStyles.map((style) => (
                <button className={`reward-choice-card reward-${style.accent}`} key={style.id} onClick={() => claimStyle(style.id)}>
                  <Crown size={16} />
                  <strong>{style.name}</strong>
                  <span>{style.detail}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sponsored-pack-showcase">
              {scene.chips.map((chip, index) => (
                <span key={chip} style={{ animationDelay: `${index * 130}ms` }}>
                  <Zap size={12} />
                  {chip}
                </span>
              ))}
            </div>
          )}
          <div className="sponsored-benefit-rail">
            {variant.rail.map((item) => <i key={item}>{item}</i>)}
          </div>
          <div className="sponsored-ad-strips">
            <i /><i /><i /><i />
          </div>
        </div>

        <div className="sponsored-progress-card">
          <div>
            {claimed ? <CheckCircle2 size={17} /> : <Timer size={17} />}
            <strong>
              {claimed
                ? 'Reward ready'
                : readyForChoice
                  ? 'Choose your reward style'
                  : currentStageComplete
                    ? `Loading Ad ${Math.min(adVariants.length, variantIndex + 2)}`
                    : `Ad ${variantIndex + 1} - ${secondsLeft}s remaining`}
            </strong>
            <span>
              {claimed
                ? '24h access active'
                : readyForChoice
                  ? pendingClaim ? 'Saved in your reward locker' : 'Creator / Gaming / Cinematic'
                  : `${scene.kicker} - ${variantIndex + 1}/${adVariants.length}`}
            </span>
          </div>
          <progress value={claimed ? 100 : progress} max={100} />
        </div>

        {readyForChoice && !claimed && (
          <div className="sponsored-choice-lock">
            {pendingClaim
              ? 'Reward locked safely. Choose Creator, Gaming, or Cinematic now, or close this popup and claim it later from Premium.'
              : 'Reward ready. Choose Creator, Gaming, or Cinematic now, or close this popup to save it in your locker for later.'}
          </div>
        )}

        {claimed && (
          <div className="sponsored-reward-list">
            {rewardItems.map((item) => (
              <span key={item.name}>
                <Zap size={12} />
                {item.name}
              </span>
            ))}
          </div>
        )}

        <footer className="modal-actions">
          <button className={claimed ? 'primary-button' : 'secondary-button'} onClick={claimed ? onClose : requestClose}>
            {claimed ? 'Use unlocked items' : readyForChoice ? (pendingClaim ? 'Claim later and close' : 'Save in locker and close') : `Watching sponsor series ${variantIndex + 1}/3`}
          </button>
        </footer>
      </section>
    </div>
  );
}
