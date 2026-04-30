import { Crown, ImagePlus, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type VersionIntroModalProps = {
  version: string;
  onContinue: () => void;
};

type IntroSlide = {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  Icon: typeof Sparkles;
  bullets: string[];
};

const slideDurationMs = 2500;

export function VersionIntroModal({ version, onContinue }: VersionIntroModalProps) {
  const slides = useMemo<IntroSlide[]>(() => [
    {
      eyebrow: `Welcome to Edify ${version}`,
      title: 'A sharper first launch for the new release.',
      body: 'This version opens with a cleaner creative flow, a more polished update path, and a stronger launch experience before you enter the editor.',
      accent: 'New version',
      Icon: Sparkles,
      bullets: ['One-time launch presentation', 'Required update flow polished', 'Cleaner first-run handoff']
    },
    {
      eyebrow: 'Thumbnail Studio',
      title: 'Better covers, faster hooks, stronger promos.',
      body: 'Thumbnail Studio is now pushed as a real creative mode with richer layouts, stronger premium packs, and a more focused pro identity.',
      accent: 'Featured mode',
      Icon: ImagePlus,
      bullets: ['Thumbnail Studio spotlight', 'Cleaner premium positioning', 'Launch-ready visual packs']
    },
    {
      eyebrow: 'VIP and premium packs',
      title: 'More creator-focused unlocks across Edify.',
      body: 'The release highlights stronger premium positioning, better unlock presentation, and a cleaner route into your advanced packs and creator tools.',
      accent: 'Premium update',
      Icon: Crown,
      bullets: ['VIP plans highlighted', 'Premium packs clearer', 'Unlock path feels more premium']
    },
    {
      eyebrow: 'Creative momentum',
      title: 'Start faster, stay in flow, keep editing.',
      body: 'You are ready to jump back into Edify with the new launch presentation, update handling, and Thumbnail Studio improvements already in place.',
      accent: 'Ready to continue',
      Icon: Wand2,
      bullets: ['Dynamic version intro', 'Smoother launch feeling', 'Continue into Edify']
    }
  ], [version]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (completed) return undefined;
    if (activeIndex >= slides.length - 1) {
      setCompleted(true);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => Math.min(current + 1, slides.length - 1));
    }, slideDurationMs);
    return () => window.clearTimeout(timer);
  }, [activeIndex, completed, slides.length]);

  const currentSlide = slides[activeIndex];
  const CurrentIcon = currentSlide.Icon;

  return (
    <div className="version-intro-scrim">
      <section className="version-intro-modal" aria-label={`Welcome to Edify ${version}`}>
        <div className="version-intro-backdrop" />
        <div className="version-intro-glowline version-intro-glowline-a" />
        <div className="version-intro-glowline version-intro-glowline-b" />
        <header className="version-intro-header">
          <div className="version-intro-brand">
            <div className="brand-mark large">E</div>
            <div>
              <span className="version-intro-overline">Welcome to Edify</span>
              <h2>New Version {version}</h2>
            </div>
          </div>
          <div className="version-intro-progress">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={`version-intro-progress-dot${index === activeIndex ? ' is-active' : ''}${index < activeIndex || completed ? ' is-done' : ''}`}
                onClick={() => {
                  setActiveIndex(index);
                  setCompleted(index === slides.length - 1);
                }}
                aria-label={`Show intro step ${index + 1}`}
              />
            ))}
          </div>
        </header>

        <div className="version-intro-body">
          <section className="version-intro-stage">
            <div className="version-intro-card is-main" key={currentSlide.title}>
              <div className="version-intro-card-badge">
                <CurrentIcon size={18} />
                <span>{currentSlide.accent}</span>
              </div>
              <span className="version-intro-eyebrow">{currentSlide.eyebrow}</span>
              <h3>{currentSlide.title}</h3>
              <p>{currentSlide.body}</p>
              <div className="version-intro-rail">
                <i style={{ width: `${((activeIndex + 1) / slides.length) * 100}%` }} />
              </div>
            </div>

            <div className="version-intro-grid">
              {currentSlide.bullets.map((bullet) => (
                <article className="version-intro-card" key={bullet}>
                  <span className="version-intro-chip">Update note</span>
                  <strong>{bullet}</strong>
                  <small>Included in the current release flow.</small>
                </article>
              ))}
            </div>
          </section>

          <aside className="version-intro-aside">
            <article className="version-intro-sidecard is-highlight">
              <span>Release presentation</span>
              <strong>Animated first launch</strong>
              <small>This appears once for this installed version, then Edify returns to the normal launch flow.</small>
            </article>
            <article className="version-intro-sidecard">
              <span>Launch path</span>
              <strong>Intro first, then consent</strong>
              <small>Your normal cookie and local-use consent still appears afterward when needed.</small>
            </article>
            <article className="version-intro-sidecard">
              <span>Current focus</span>
              <strong>Thumbnail Studio and premium packs</strong>
              <small>The new release highlights creator tools, VIP positioning, and a cleaner update experience.</small>
            </article>
          </aside>
        </div>

        <footer className="version-intro-footer">
          <div className="version-intro-footer-copy">
            <strong>{completed ? 'Presentation complete' : `Step ${activeIndex + 1} of ${slides.length}`}</strong>
            <small>{completed ? 'Continue into Edify and keep the normal first-run flow afterward.' : 'The intro will continue automatically through this release presentation.'}</small>
          </div>
          <div className="version-intro-footer-actions">
            {!completed && (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setActiveIndex(slides.length - 1);
                  setCompleted(true);
                }}
              >
                Skip to final step
              </button>
            )}
            <button className="primary-button" type="button" onClick={onContinue} disabled={!completed}>
              Continue
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
