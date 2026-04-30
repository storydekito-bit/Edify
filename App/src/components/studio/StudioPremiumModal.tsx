import { Crown, Lock, Sparkles, X } from 'lucide-react';
import type { StudioPremiumFeature } from '../../types/studio';

type StudioPremiumModalProps = {
  feature: StudioPremiumFeature | null;
  title?: string;
  onClose: () => void;
  onOpenPremium?: () => void;
};

const featureCopy: Record<StudioPremiumFeature, { title: string; detail: string }> = {
  'ai-tools': {
    title: 'AI Studio Tools',
    detail: 'Unlock generative fill, background removal, upscale, and advanced subject workflows.'
  },
  'advanced-layers': {
    title: 'Advanced Layers',
    detail: 'Unlock smart objects, clipping masks, richer shape tools, and deeper layer stack control.'
  },
  'high-res-export': {
    title: 'High Resolution Export',
    detail: 'Export clean PNG, JPG, WEBP, SVG, and PDF masters without low-res limits.'
  },
  'cloud-save': {
    title: 'Cloud Save',
    detail: 'Sync Studio projects, prompt history, layers, and presets across your Edify devices.'
  },
  'premium-filters': {
    title: 'Premium Filters',
    detail: 'Use cinematic packs, Roblox glow, YouTube enhancer, bloom stacks, and creator polish effects.'
  },
  'advanced-workspace': {
    title: 'Thumbnail Studio Pro',
    detail: 'Unlock the richer premium workspace, stronger creator filters, cloud save perks, and high-quality export tools.'
  }
};

export function StudioPremiumModal({ feature, title, onClose, onOpenPremium }: StudioPremiumModalProps) {
  if (!feature) return null;
  const copy = featureCopy[feature];
  return (
    <div className="modal-scrim">
      <div className="modal studio-premium-modal">
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">Thumbnail Studio Pro</span>
            <h2>{title || copy.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="studio-premium-hero">
          <div className="studio-premium-icon"><Crown size={24} /></div>
          <p>{copy.detail}</p>
        </div>
        <div className="studio-premium-grid">
          <article>
            <strong>Free</strong>
            <span>Basic layer editing, standard exports, core shapes, text, crop, and beginner tools.</span>
          </article>
          <article className="is-highlighted">
            <strong>Pro</strong>
            <span>AI tools, premium filters, high resolution export, cloud save, and advanced workspace unlocks.</span>
          </article>
          <article>
            <strong>Studio Max</strong>
            <span>All Pro tools, extended project sync, future collaboration, plugin installs, and review workflows.</span>
          </article>
        </div>
        <div className="studio-premium-footer">
          <button className="secondary-button" type="button" onClick={onClose}>
            <Lock size={14} /> Keep browsing
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              onOpenPremium?.();
              onClose();
            }}
          >
            <Sparkles size={14} /> Open Premium
          </button>
        </div>
      </div>
    </div>
  );
}
