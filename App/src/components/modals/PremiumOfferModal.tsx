import { Crown, X, Zap } from 'lucide-react';
import { useState } from 'react';
import {
  activatePremiumPlan,
  hasAnyPremium,
  isPlanActive,
  loadPremiumAccess,
  premiumPlans,
  publicPromoCodes,
  type PremiumAccess
} from '../../lib/premium';
import type { DesktopAccountUser, Toast } from '../../types/edify';

type PremiumOfferModalProps = {
  reason?: string;
  accountUser?: DesktopAccountUser | null;
  onClose: () => void;
  onConnectAccount?: () => void;
  onAccessChange?: (access: PremiumAccess) => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

export function PremiumOfferModal({ reason, accountUser = null, onClose, onConnectAccount, onAccessChange, pushToast }: PremiumOfferModalProps) {
  const [access, setAccess] = useState(() => loadPremiumAccess());
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [activePromo, setActivePromo] = useState<typeof publicPromoCodes[number] | null>(null);

  const updateAccess = (nextAccess: PremiumAccess) => {
    setAccess(nextAccess);
    onAccessChange?.(nextAccess);
  };

  const buyPlan = (plan: typeof premiumPlans[number]) => {
    if (!accountUser) {
      pushToast({
        title: 'Sign in required',
        detail: 'Connect an Edify account before purchasing Premium so plans, rewards, and future sync stay linked to you.',
        tone: 'warning'
      });
      onConnectAccount?.();
      return;
    }
    const nextAccess = activatePremiumPlan(access, plan);
    updateAccess(nextAccess);
    pushToast({
      title: `${plan.name} active`,
      detail: hasAnyPremium(nextAccess) ? 'Premium tools are ready for this project.' : undefined,
      tone: 'success'
    });
    onClose();
  };

  const applyCodeValue = (value: string) => {
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
    const promo = publicPromoCodes.find((item) => item.code === normalized);
    if (!promo) {
      pushToast({ title: 'Code not valid', detail: 'Check the promo code and try again.', tone: 'warning' });
      return;
    }
    setActivePromo(promo);
    setCode('');
    setShowCode(false);
    pushToast({ title: `${promo.label} applied`, detail: 'Prices were updated in the offers below.', tone: 'success' });
  };

  const applyCode = () => applyCodeValue(code);
  const discountPercent = activePromo ? Number(activePromo.label.match(/\d+/)?.[0] ?? 0) : 0;
  const discountedPrice = (price: string) => {
    const amount = Number(price.replace(/[^0-9.]/g, ''));
    if (!discountPercent || !Number.isFinite(amount)) return price;
    return `$${Math.max(0.99, amount * (1 - discountPercent / 100)).toFixed(2)}`;
  };

  return (
    <div className="modal-scrim premium-offer-scrim">
      <section className="modal premium-offer-modal">
        <header className="premium-offer-header">
          <div>
            <span className="premium-offer-kicker"><Crown size={14} /> Edify Premium</span>
            <h2>Upgrade your edit quality</h2>
            <p>{reason ?? 'Choose a plan to unlock VIP transitions, premium effects, AI edit helpers, and pro export quality.'}</p>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>

        <section className={`premium-account-banner ${accountUser ? 'connected' : 'locked'}`}>
          <div>
            <strong>{accountUser ? `Connected as ${accountUser.email}` : 'Sign in to buy Premium'}</strong>
            <span>
              {accountUser
                ? 'Your plans, activated packs, promo codes, rewards, and future sync features will stay attached to this Edify account.'
                : 'Premium purchases require an Edify account so we can attach Creator Pro, Gaming Pro, Cinematic Pro, Studio Max, rewards, favorites, and future cloud perks to you.'}
            </span>
          </div>
          {!accountUser && (
            <button className="secondary-button" type="button" onClick={onConnectAccount}>
              Connect account
            </button>
          )}
        </section>

        <section className="premium-benefits-grid">
          <article className="premium-benefit-card">
            <strong>Profile and sync</strong>
            <span>Keep your identity, provider, favorites, settings, workspace layout, and export/text presets connected to one Edify profile.</span>
          </article>
          <article className="premium-benefit-card">
            <strong>Premium and rewards</strong>
            <span>Link Creator Pro, Gaming Pro, Cinematic Pro, Studio Max, promo codes, daily unlocks, sponsored rewards, and premium trials to your account.</span>
          </article>
          <article className="premium-benefit-card">
            <strong>Marketplace and future cloud</strong>
            <span>Keep purchased packs, transitions, sounds, templates, caption styles, light project sync, review links, team features, and your brand kit ready for later.</span>
          </article>
        </section>

        <div className="premium-offer-grid">
          {premiumPlans.map((plan) => {
            const active = isPlanActive(access, plan);
            const buttonLabel = active ? 'Current plan' : accountUser ? 'Buy Premium' : 'Connect account';
            return (
              <article className={`premium-offer-card ${plan.featured ? 'featured' : ''} ${active ? 'active' : ''}`} key={plan.id}>
                <div className="premium-offer-badge">{activePromo ? `${activePromo.label} active` : plan.badge}</div>
                <h3>{plan.name}</h3>
                <div className="premium-offer-price">
                  {activePromo && <em>{plan.price}</em>}
                  <strong>{activePromo ? discountedPrice(plan.price) : plan.price}</strong>
                  <span>{plan.cadence}</span>
                </div>
                {activePromo && <div className="premium-offer-discount">-{discountPercent}% with {activePromo.code}</div>}
                <ul>
                  {plan.benefits.map((benefit) => (
                    <li key={benefit}><Zap size={12} /> {benefit}</li>
                  ))}
                </ul>
                <button
                  className={active ? 'secondary-button' : 'primary-button'}
                  onClick={() => {
                    if (!accountUser && !active) {
                      onConnectAccount?.();
                    }
                    buyPlan(plan);
                  }}
                >
                  {buttonLabel}
                </button>
              </article>
            );
          })}
        </div>

        <footer className="premium-offer-footer">
          {activePromo && <div className="promo-active-banner">{activePromo.label} applied to the offers. Choose a plan to continue.</div>}
          <button className="code-reveal-button" onClick={() => setShowCode((current) => !current)}>
            Use a Code
          </button>
          {showCode && (
            <div className="premium-offer-code">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyCode();
                }}
                placeholder="Enter code"
              />
              <button className="secondary-button" onClick={applyCode}>Apply</button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}
