import { CheckCircle2, Crown, Sparkles, Timer, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { activateSponsoredReward, type PremiumAccess } from '../../lib/premium';
import type { PremiumEffectPreset } from '../../lib/presets';
import type { Toast } from '../../types/edify';

type SponsoredUnlockModalProps = {
  access: PremiumAccess;
  candidates: PremiumEffectPreset[];
  onAccessChange: (access: PremiumAccess) => void;
  onClose: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

const adScenes = [
  {
    kicker: 'Meet Edify Premium',
    title: 'Edit faster. Look sharper.',
    detail: 'Premium effects, titles, transitions, captions, and export helpers built for creators.',
    chips: ['Creator Pro', 'Gaming Pro', 'Cinematic Pro']
  },
  {
    kicker: 'Creator packs',
    title: 'Make every clip feel finished',
    detail: 'Glow, skin light, clean titles, kinetic captions, lower thirds, and polished social looks.',
    chips: ['VIP captions', 'Creator glow', 'Text studio']
  },
  {
    kicker: 'Motion energy',
    title: 'Transitions that actually sell the cut',
    detail: 'Glass wipes, zoom warps, glitch portals, whip cuts, impact flashes, and smooth motion punch.',
    chips: ['Transition vault', 'Speed ramp', 'Beat cuts']
  },
  {
    kicker: 'Export boost',
    title: 'Preview a premium workflow',
    detail: 'Try selected premium tools for 24 hours, then keep the edit moving without breaking flow.',
    chips: ['24h trial', '5 random tools', 'No tracking']
  },
  {
    kicker: 'Reward reveal',
    title: 'Your trial pack is almost ready',
    detail: 'When the reel ends, Edify unlocks 5 random base premium items on this device.',
    chips: ['Sponsored unlock', 'Local access', 'Creator friendly']
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
  return pool
    .map((item) => ({ item, score: Math.random() }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(({ item }) => item);
}

function useChillSponsorMusic(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    contextRef.current = context;
    const master = context.createGain();
    master.gain.value = 0.032;
    master.connect(context.destination);
    const notes = [261.63, 329.63, 392, 493.88, 440, 392, 329.63, 293.66];
    let step = 0;

    const playNote = () => {
      const now = context.currentTime;
      const note = notes[step % notes.length];
      const osc = context.createOscillator();
      const tone = context.createGain();
      const filter = context.createBiquadFilter();
      osc.type = step % 4 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = note;
      filter.type = 'lowpass';
      filter.frequency.value = 950;
      tone.gain.setValueAtTime(0.0001, now);
      tone.gain.exponentialRampToValueAtTime(0.55, now + 0.03);
      tone.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(filter);
      filter.connect(tone);
      tone.connect(master);
      osc.start(now);
      osc.stop(now + 0.46);

      if (step % 4 === 0) {
        const bass = context.createOscillator();
        const bassGain = context.createGain();
        bass.type = 'sine';
        bass.frequency.value = note / 2;
        bassGain.gain.setValueAtTime(0.0001, now);
        bassGain.gain.exponentialRampToValueAtTime(0.32, now + 0.04);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
        bass.connect(bassGain);
        bassGain.connect(master);
        bass.start(now);
        bass.stop(now + 0.72);
      }

      step += 1;
    };

    void context.resume().catch(() => undefined);
    playNote();
    const interval = window.setInterval(playNote, 430);
    return () => {
      window.clearInterval(interval);
      void context.close().catch(() => undefined);
      contextRef.current = null;
    };
  }, [enabled]);
}

export function SponsoredUnlockModal({ access, candidates, onAccessChange, onClose, pushToast }: SponsoredUnlockModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [rewardItems, setRewardItems] = useState<PremiumEffectPreset[]>([]);
  const [claimed, setClaimed] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const elapsed = 30 - secondsLeft;
  const scene = adScenes[Math.min(adScenes.length - 1, Math.floor(elapsed / 6))];
  const progress = Math.round((elapsed / 30) * 100);
  const readyForChoice = secondsLeft === 0 && !claimed;
  useChillSponsorMusic(musicEnabled && !claimed);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const claimStyle = (pack: string) => {
    const selectedItems = pickRewardItems(candidates, pack);
    const nextAccess = activateSponsoredReward(access, selectedItems.map((item) => item.name), 24);
    setRewardItems(selectedItems);
    setClaimed(true);
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
            <p>Watch this Edify sponsor reel to unlock 5 random base premium items for your current device.</p>
          </div>
          <div className="sponsored-header-actions">
            <button className="icon-button" onClick={() => setMusicEnabled((current) => !current)} title={musicEnabled ? 'Mute music' : 'Play music'}>
              {musicEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button className="icon-button" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className={`sponsored-ad-stage scene-${Math.min(adScenes.length - 1, Math.floor(elapsed / 6))}`}>
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
            <i>Effects</i>
            <i>Captions</i>
            <i>Transitions</i>
            <i>Exports</i>
          </div>
          <div className="sponsored-ad-strips">
            <i /><i /><i /><i />
          </div>
        </div>

        <div className="sponsored-progress-card">
          <div>
            {claimed ? <CheckCircle2 size={17} /> : <Timer size={17} />}
            <strong>{claimed ? 'Reward ready' : readyForChoice ? 'Choose your reward style' : `${secondsLeft}s remaining`}</strong>
            <span>{claimed ? '24h access active' : readyForChoice ? 'Creator / Gaming / Cinematic' : scene.kicker}</span>
          </div>
          <progress value={claimed ? 100 : progress} max={100} />
        </div>

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
          <button className={claimed ? 'primary-button' : 'secondary-button'} onClick={onClose}>
            {claimed ? 'Use unlocked items' : readyForChoice ? 'Choose a style above' : 'Watching sponsor...'}
          </button>
        </footer>
      </section>
    </div>
  );
}
