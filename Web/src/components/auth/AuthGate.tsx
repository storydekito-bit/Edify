import { AlertTriangle, Github, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { appwriteConfig, signInWithProvider, signOutCurrentUser, type AppwriteOAuthProvider, type AppwriteUser } from '../../lib/appwrite';

type AuthGateProps = {
  user: AppwriteUser | null;
  variant?: 'fullscreen' | 'modal';
  onAuthenticated: (user: AppwriteUser) => void;
  onSignedOut?: () => void;
  onClose?: () => void;
};

const providers: Array<{
  id: AppwriteOAuthProvider;
  label: string;
  detail: string;
  tone: string;
}> = [
  {
    id: 'google',
    label: 'Continue with Google',
    detail: 'Fast sign-in for creator profiles and future sync.',
    tone: 'google'
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    detail: 'Useful for dev creators, plugin authors, and technical teams.',
    tone: 'github'
  },
  {
    id: 'microsoft',
    label: 'Continue with Microsoft',
    detail: 'Great for Windows workflows, business accounts, and studio teams.',
    tone: 'microsoft'
  }
];

function ProviderBadge({ provider }: { provider: AppwriteOAuthProvider }) {
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

export function AuthGate({ user, variant = 'fullscreen', onSignedOut, onClose }: AuthGateProps) {
  const isFileProtocol = window.location.protocol === 'file:';
  const [busyProvider, setBusyProvider] = useState<AppwriteOAuthProvider | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'warning'; text: string } | null>(null);

  const startProviderFlow = async (provider: AppwriteOAuthProvider) => {
    setBusyProvider(provider);
    setMessage(null);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      setBusyProvider(null);
      setMessage({
        tone: 'warning',
        text: error instanceof Error ? error.message : 'Edify could not start this provider sign-in.'
      });
    }
  };

  if (user) {
    return (
      <section className={`auth-shell ${variant === 'modal' ? 'is-modal' : ''}`}>
        <div className="auth-card auth-account-card">
          {variant === 'modal' && onClose && (
            <button className="auth-close-button" type="button" onClick={onClose} aria-label="Close account panel">
              <X size={18} />
            </button>
          )}
          <div className="auth-brand-line">
            <span className="brand-mark large">E</span>
            <div>
              <span className="auth-eyebrow">Account connected</span>
              <h1>{user.name || user.email}</h1>
              <p>{user.email}</p>
            </div>
          </div>
          <div className="auth-message auth-success">
            <ShieldCheck size={16} />
            <span>Your Edify account is active for this browser session.</span>
          </div>
          <div className="auth-provider-summary">
            <div>
              <strong>Connected session</strong>
              <span>Use the editor normally, then sign out here whenever you want.</span>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={async () => {
                await signOutCurrentUser().catch(() => undefined);
                onSignedOut?.();
              }}
            >
              Sign out
            </button>
          </div>
          <div className="auth-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Continue editing
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`auth-shell ${variant === 'modal' ? 'is-modal' : ''}`}>
      <div className="auth-background-orb auth-orb-left" />
      <div className="auth-background-orb auth-orb-right" />
      <div className="auth-card auth-provider-card">
        {variant === 'modal' && onClose && (
          <button className="auth-close-button" type="button" onClick={onClose} aria-label="Close account panel">
            <X size={18} />
          </button>
        )}

        <div className="auth-topline">
          <span className="brand-mark large">E</span>
          <div className="auth-hero-copy">
            <span className="auth-eyebrow">Account</span>
            <h1>Connect Edify your way</h1>
            <p>Pick a provider to unlock account identity in the web editor. The editor stays available even if you skip this step.</p>
          </div>
        </div>

        <div className="auth-callout-grid">
          <div className="auth-message auth-info">
            <ShieldCheck size={16} />
            <span>Sign in for account identity, future sync, and premium profile access.</span>
          </div>
          {isFileProtocol && (
            <div className="auth-message auth-warning">
              <AlertTriangle size={16} />
              <span>OAuth works from localhost or a real domain, not from a file:// page opened directly in the browser.</span>
            </div>
          )}
          {!appwriteConfig.ready && (
            <div className="auth-message auth-warning">
              <AlertTriangle size={16} />
              <span>Appwrite configuration is missing. Add your endpoint and project ID first.</span>
            </div>
          )}
        </div>

        <div className="auth-provider-grid">
          {providers.map((provider) => (
            <button
              key={provider.id}
              className={`auth-provider-button is-${provider.tone}`}
              disabled={busyProvider !== null || !appwriteConfig.ready || isFileProtocol}
              onClick={() => void startProviderFlow(provider.id)}
              type="button"
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

        {message && (
          <div className={`auth-message auth-${message.tone}`}>
            <AlertTriangle size={16} />
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </section>
  );
}
