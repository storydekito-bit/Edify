import { CheckCircle2, Crown, Sparkles, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { activateSponsoredReward, type PremiumAccess } from '../../lib/premium';
import type { Toast } from '../../types/edify';

type ThumbnailPromoModalProps = {
  access: PremiumAccess;
  onAccessChange: (access: PremiumAccess) => void;
  onClose: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

const duration = 15;
const scenes = [
  {
    kicker: 'THUMBNAIL LABS PRO',
    title: 'Build covers that feel worth clicking.',
    detail: 'Free transform, text placement, custom background image, and cleaner creator layouts inside Edify.'
  },
  {
    kicker: 'VIP DESIGN FLOW',
    title: 'Turn one frame into a real thumbnail concept.',
    detail: 'Move title, ribbon, subtitle, and image layers like a dedicated cover editor.'
  },
  {
    kicker: '15 SECOND TRIAL',
    title: 'Watch this short sponsor and unlock the pro thumbnail workflow.',
    detail: 'A chill promo, a temporary VIP unlock, and a much stronger creator cover tool.'
  }
];

function usePromoMusic(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    contextRef.current = context;
    const master = context.createGain();
    master.gain.value = 0.05;
    master.connect(context.destination);

    const notes = [261.63, 329.63, 392, 523.25, 587.33, 523.25, 392, 329.63];
    let step = 0;

    const playNote = () => {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const pad = context.createOscillator();
      const leadGain = context.createGain();
      const padGain = context.createGain();
      osc.type = 'triangle';
      pad.type = 'sine';
      osc.frequency.value = notes[step % notes.length];
      pad.frequency.value = notes[(step + 2) % notes.length] / 2;

      leadGain.gain.setValueAtTime(0.0001, now);
      leadGain.gain.exponentialRampToValueAtTime(0.38, now + 0.04);
      leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

      padGain.gain.setValueAtTime(0.0001, now);
      padGain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
      padGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.88);

      osc.connect(leadGain);
      pad.connect(padGain);
      leadGain.connect(master);
      padGain.connect(master);
      osc.start(now);
      pad.start(now);
      osc.stop(now + 0.58);
      pad.stop(now + 0.92);
      step += 1;
    };

    void context.resume().catch(() => undefined);
    playNote();
    const timer = window.setInterval(playNote, 420);
    return () => {
      window.clearInterval(timer);
      void context.close().catch(() => undefined);
      contextRef.current = null;
    };
  }, [enabled]);
}

export function ThumbnailPromoModal({ access, onAccessChange, onClose, pushToast }: ThumbnailPromoModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const sceneIndex = Math.min(scenes.length - 1, Math.floor(((duration - secondsLeft) / duration) * scenes.length));
  const scene = scenes[sceneIndex];
  const progress = Math.round(((duration - secondsLeft) / duration) * 100);
  usePromoMusic(musicEnabled && !claimed);

  useEffect(() => {
    if (claimed || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [claimed, secondsLeft]);

  const claimReward = () => {
    const nextAccess = activateSponsoredReward(access, ['thumbnail-pro'], 24, {
      chosenPack: 'Thumbnail Pro Trial',
      campaignId: 'thumbnail-pro-quick-ad'
    });
    onAccessChange(nextAccess);
    setClaimed(true);
    pushToast({
      title: 'Thumbnail Pro unlocked',
      detail: 'The VIP thumbnail workflow is now active for 24 hours on this device.',
      tone: 'success'
    });
  };

  return (
    <div className="modal-scrim sponsored-unlock-scrim">
      <section className="modal thumbnail-promo-modal">
        <header className="sponsored-unlock-header">
          <div>
            <span className="premium-offer-kicker"><Sparkles size={14} /> Thumbnail Labs Pro</span>
            <h2>Unlock the VIP thumbnail workflow</h2>
            <p>Watch a short 15 second promo, then unlock the pro thumbnail canvas with drag placement, custom backdrops, and richer creator cover controls.</p>
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

        <div className="thumbnail-promo-stage">
          <div className="thumbnail-promo-glow left" />
          <div className="thumbnail-promo-glow right" />
          <div className="thumbnail-promo-copy" key={scene.title}>
            <small>{scene.kicker}</small>
            <h3>{scene.title}</h3>
            <p>{scene.detail}</p>
          </div>
          <div className="thumbnail-promo-strip">
            <span><Crown size={14} /> VIP thumbnail canvas</span>
            <span><Zap size={14} /> Drag and place layers</span>
            <span><Sparkles size={14} /> Chill creator look</span>
          </div>
          <div className="thumbnail-promo-progress">
            <div className="thumbnail-promo-progress-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
            <strong>{claimed ? 'Unlocked' : `${secondsLeft}s`}</strong>
          </div>
        </div>

        <div className="thumbnail-promo-actions">
          {secondsLeft > 0 ? (
            <button className="primary-button" type="button" disabled>
              Watch to unlock
            </button>
          ) : claimed ? (
            <button className="secondary-button" type="button" onClick={onClose}>
              <CheckCircle2 size={16} />
              Continue
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={claimReward}>
              <Crown size={16} />
              Unlock Thumbnail Pro
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
