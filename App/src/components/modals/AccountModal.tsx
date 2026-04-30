import type { ReactNode } from 'react';
import { AlertTriangle, Cloud, Crown, FolderKanban, Github, Gift, History, ShieldCheck, X } from 'lucide-react';
import { activeRewardUnlocks, getPendingSponsoredClaim, getRewardHistory, hasAnyPremium, hasUltraExport, loadPremiumAccess } from '../../lib/premium';
import type { DesktopAccountProvider, DesktopAccountUser, ProjectSummary } from '../../types/edify';

type AccountModalProps = {
  user: DesktopAccountUser | null;
  recentProjects: ProjectSummary[];
  busyProvider: DesktopAccountProvider | null;
  message?: string;
  onClose: () => void;
  onProviderSelect: (provider: DesktopAccountProvider) => void;
  onSignOut: () => void;
};

const providers = [
  {
    id: 'google' as const,
    label: 'Continue with Google',
    detail: 'Creator-friendly sign-in for profile sync, cloud projects, premium access, and future mobile continuity.',
    tone: 'google'
  },
  {
    id: 'github' as const,
    label: 'Continue with GitHub',
    detail: 'A clean fit for plugins, creator tooling, automation presets, and technical project flows.',
    tone: 'github'
  },
  {
    id: 'microsoft' as const,
    label: 'Continue with Microsoft',
    detail: 'Built for Windows-first creators who want desktop identity, account sync, and business-ready sessions.',
    tone: 'microsoft'
  }
];

function ProviderBadge({ provider }: { provider: DesktopAccountProvider }) {
  if (provider === 'github') {
    return <Github size={16} />;
  }

  if (provider === 'google') {
    return (
      <svg className="auth-provider-google-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12.24 10.285v3.95h5.49c-.24 1.28-.96 2.365-2.05 3.095l3.31 2.57c1.93-1.78 3.04-4.4 3.04-7.52 0-.73-.07-1.43-.2-2.095z" />
        <path fill="#4285F4" d="M12 22c2.7 0 4.96-.89 6.62-2.43l-3.31-2.57c-.92.62-2.1.99-3.31.99-2.54 0-4.69-1.72-5.46-4.03H3.12v2.63A9.996 9.996 0 0 0 12 22z" />
        <path fill="#FBBC05" d="M6.54 13.96A5.998 5.998 0 0 1 6.24 12c0-.68.12-1.34.3-1.96V7.41H3.12A9.996 9.996 0 0 0 2 12c0 1.61.39 3.13 1.12 4.41z" />
        <path fill="#34A853" d="M12 6.01c1.47 0 2.79.51 3.83 1.51l2.87-2.87C16.95 2.98 14.69 2 12 2A9.996 9.996 0 0 0 3.12 7.41l3.42 2.63C7.31 7.73 9.46 6.01 12 6.01z" />
      </svg>
    );
  }

  return (
    <span className="auth-provider-microsoft-icon" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function AccountModal({ user, recentProjects, busyProvider, message, onClose, onProviderSelect, onSignOut }: AccountModalProps) {
  const premiumAccess = loadPremiumAccess();
  const activeRewards = activeRewardUnlocks(premiumAccess);
  const rewardHistory = getRewardHistory(premiumAccess);
  const pendingClaim = getPendingSponsoredClaim(premiumAccess);
  const localProjectCount = recentProjects.filter((project) => project.source !== 'cloud').length;
  const cloudProjectCount = recentProjects.filter((project) => project.source === 'cloud').length;
  const premiumLabel = hasUltraExport(premiumAccess)
    ? 'Studio-grade Premium'
    : hasAnyPremium(premiumAccess)
      ? 'Premium pack linked'
      : 'Free profile';

  if (user) {
    return (
      <div className="modal-scrim">
        <section className="auth-shell is-modal">
          <div className="auth-background-orb auth-orb-left" />
          <div className="auth-background-orb auth-orb-right" />
          <div className="auth-card auth-provider-card">
            <button className="auth-close-button" type="button" onClick={onClose} aria-label="Close account panel">
              <X size={18} />
            </button>

            <div className="auth-topline">
              <span className="brand-mark large">E</span>
              <div className="auth-hero-copy">
                <span className="auth-eyebrow">Account connected</span>
                <h1>{user.name || user.email}</h1>
                <p>{user.email}</p>
              </div>
            </div>

            <div className="auth-callout-grid">
              <div className="auth-message auth-info">
                <ShieldCheck size={16} />
                <span>Your Edify desktop session is active with {user.provider[0].toUpperCase() + user.provider.slice(1)} and can sync local-first cloud features across your devices.</span>
              </div>
            </div>

            <div className="account-status-grid">
              <AccountStat icon={<FolderKanban size={16} />} label="Local projects" value={`${localProjectCount}`} detail="Saved on this device" />
              <AccountStat icon={<Cloud size={16} />} label="Cloud-linked" value={`${cloudProjectCount}`} detail="Account project mirrors" />
              <AccountStat icon={<Crown size={16} />} label="Premium" value={premiumLabel} detail={hasAnyPremium(premiumAccess) ? 'Packs, exports, and rewards travel with this account.' : 'Connect premium plans and rewards to this identity.'} />
              <AccountStat icon={<Gift size={16} />} label="Reward locker" value={activeRewards.length ? `${activeRewards.length} active` : pendingClaim ? 'Choice waiting' : 'Ready'} detail={activeRewards.length ? 'Sponsored unlocks currently attached to this account.' : pendingClaim ? 'A sponsored claim is waiting to be chosen.' : 'Daily unlock and history stay on your profile.'} />
            </div>

            <div className="account-summary-grid">
              <div className="account-summary-card">
                <strong><Cloud size={15} /> What this account keeps</strong>
                <ul>
                  <li>Connected provider, identity, and future avatar sync</li>
                  <li>Cloud project mirrors and recent project recovery</li>
                  <li>Premium plans, promo codes, rewards, and sponsor history</li>
                  <li>Future presets, workspace layouts, review links, and brand kits</li>
                </ul>
              </div>
              <div className="account-summary-card">
                <strong><History size={15} /> Recent sync signals</strong>
                <ul>
                  <li>{cloudProjectCount > 0 ? `${cloudProjectCount} project${cloudProjectCount > 1 ? 's' : ''} already linked to your Edify account.` : 'No cloud-linked project yet. Save while connected to mirror the project.'}</li>
                  <li>{rewardHistory[0] ? `Last sponsored reward: ${rewardHistory[0].chosenPack}.` : 'No sponsored reward claimed yet on this account.'}</li>
                  <li>{hasAnyPremium(premiumAccess) ? 'Premium purchase state is attached to this connected profile.' : 'Premium checkout will ask for an account so plans stay linked.'}</li>
                </ul>
              </div>
            </div>

            <div className="auth-provider-summary">
              <div>
                <strong>Connected session</strong>
                <span>You can keep editing, sync lightweight projects on save, and sign out here whenever you want.</span>
              </div>
              <button className="ghost-button" type="button" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="modal-scrim">
      <section className="auth-shell is-modal">
        <div className="auth-background-orb auth-orb-left" />
        <div className="auth-background-orb auth-orb-right" />
        <div className="auth-card auth-provider-card">
          <button className="auth-close-button" type="button" onClick={onClose} aria-label="Close account panel">
            <X size={18} />
          </button>

          <div className="auth-topline">
            <span className="brand-mark large">E</span>
            <div className="auth-hero-copy">
              <span className="auth-eyebrow">Account</span>
              <h1>Desktop account center</h1>
              <p>Connect Edify once to carry your identity, premium plans, reward history, and lightweight cloud project sync across installs and devices.</p>
            </div>
          </div>

          <div className="auth-callout-grid">
            <div className="auth-message auth-info">
              <ShieldCheck size={16} />
              <span>Use a provider to unlock project sync, premium ownership, sponsor rewards, favorites, and future cross-device continuity.</span>
            </div>
            <div className="auth-message auth-warning">
              <AlertTriangle size={16} />
              <span>The secure Appwrite flow opens in your browser, then returns the session directly to Edify desktop.</span>
            </div>
          </div>

          <div className="account-status-grid account-status-grid-compact">
            <AccountStat icon={<Cloud size={16} />} label="Cloud projects" value={cloudProjectCount ? `${cloudProjectCount} ready` : 'Not linked'} detail="Save while connected to mirror projects to your account." />
            <AccountStat icon={<Crown size={16} />} label="Premium linkage" value={hasAnyPremium(premiumAccess) ? 'Waiting for sign-in' : 'Required'} detail="Premium plans now require an account so purchases stay attached." />
            <AccountStat icon={<Gift size={16} />} label="Rewards" value={rewardHistory.length ? `${rewardHistory.length} history` : 'Empty'} detail="Daily unlocks and sponsor rewards can follow your profile." />
          </div>

          <div className="auth-provider-grid">
            {providers.map((provider) => (
              <button
                key={provider.id}
                className={`auth-provider-button is-${provider.tone}`}
                onClick={() => onProviderSelect(provider.id)}
                type="button"
                disabled={busyProvider !== null}
              >
                <span className="auth-provider-badge" aria-hidden="true">
                  <ProviderBadge provider={provider.id} />
                </span>
                <span className="auth-provider-copy">
                  <strong>{busyProvider === provider.id ? `Redirecting to ${provider.label.replace('Continue with ', '')}...` : provider.label}</strong>
                  <small>{provider.detail}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="account-summary-card account-benefits-card">
            <strong><ShieldCheck size={15} /> Why connect Edify</strong>
            <ul>
              <li>Keep your premium plans, packs, and promo redemptions tied to your profile</li>
              <li>Find cloud-linked projects again after reinstalling or moving machines</li>
              <li>Keep sponsored rewards, daily unlocks, and future marketplace history safe</li>
              <li>Prepare for brand kits, team review links, and shared presets later</li>
            </ul>
          </div>

          {message && (
            <div className="auth-message auth-warning">
              <AlertTriangle size={16} />
              <span>{message}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AccountStat({
  icon,
  label,
  value,
  detail
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="account-stat-card">
      <span className="account-stat-icon">{icon}</span>
      <strong>{label}</strong>
      <b>{value}</b>
      <small>{detail}</small>
    </div>
  );
}
