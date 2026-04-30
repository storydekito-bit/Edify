import { ArrowRight, Crown, Download, Play, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';

const heroPreview = new URL('../../../web-check.png', import.meta.url).href;
const premiumPreview = new URL('../../../web-check-premium-front.png', import.meta.url).href;
const exportPreview = new URL('../../../web-check-premium-export.png', import.meta.url).href;

const premiumPlans = [
  {
    name: 'Creator Pro',
    price: '$4.99',
    badge: 'Best for shorts',
    features: ['Creator glow effects', 'VIP text templates', 'Caption style AI', 'Glass transitions']
  },
  {
    name: 'Gaming Pro',
    price: '$6.99',
    badge: 'Motion pack',
    features: ['Speed ramp shock', 'Glitch portal transitions', 'Rank-up captions', 'Highlight presets']
  },
  {
    name: 'Cinematic Pro',
    price: '$7.99',
    badge: 'Most popular',
    features: ['Premium 1440p export', 'Film title cards', 'Anamorphic transitions', 'AI color match']
  },
  {
    name: 'Studio Max',
    price: '$14.99',
    badge: 'Everything',
    features: ['4K Ultra export', 'All premium transitions', 'All premium text packs', 'All AI edit helpers']
  }
];

const featureBands = [
  {
    title: 'Desktop-grade timeline, now on the web',
    detail: 'Edify keeps the same fast timeline language: multi-track editing, rich inspector controls, premium packs, transitions, captions, review systems, and export flow.',
    image: heroPreview,
    kicker: 'Real editor view'
  },
  {
    title: 'Premium packs, clearly presented',
    detail: 'Premium plans, locked previews, creator packs, gaming motion systems, cinematic looks, caption styles, and VIP export options all have a dedicated storefront surface.',
    image: premiumPreview,
    kicker: 'Premium storefront'
  },
  {
    title: 'Clear export flow',
    detail: 'Show formats, quality, naming, bitrate, watermark rules, premium export levels, and the render path in a way that feels like a real product instead of a mockup.',
    image: exportPreview,
    kicker: 'Export experience'
  }
];

const productHighlights = [
  { title: 'Magic Edit', detail: 'Build a montage with music, cuts, captions, effects and transitions in one move.', icon: Wand2 },
  { title: 'Premium Packs', detail: 'Creator, Gaming, Cinematic and Studio packs with sharper premium differentiation.', icon: Crown },
  { title: 'Review & Safety', detail: 'Warnings, project checks, fix-all workflows, and export-safe guidance.', icon: ShieldCheck },
  { title: 'Fast Editor', detail: 'Open the same Edify editor directly on the web when you want to test or demo the experience.', icon: Play }
];

export function WebLanding({
  onOpenEditor
}: {
  onOpenEditor: () => void;
}) {
  return (
    <main className="web-landing">
      <section className="web-hero" style={{ backgroundImage: `linear-gradient(135deg, rgba(5, 7, 12, 0.68), rgba(5, 7, 12, 0.86)), url(${heroPreview})` }}>
        <header className="web-nav">
          <div className="web-brand">
            <div className="brand-mark large">E</div>
            <div>
              <strong>Edify</strong>
              <span>Windows-first editor</span>
            </div>
          </div>
          <div className="web-nav-actions">
            <a className="secondary-button" href="#premium">Premium</a>
            <button className="secondary-button" type="button" onClick={onOpenEditor}>Edit in Web</button>
            <a className="primary-button" href="../App/release/Edify%20Setup%200.1.0.exe" download>
              <Download size={16} />
              Download Setup
            </a>
          </div>
        </header>

        <div className="web-hero-copy">
          <span className="web-kicker">Welcome to Edify</span>
          <h1>A premium video editor built to feel like a real desktop product.</h1>
          <p>
            Edify blends the fast flow of modern creator tools with a richer premium identity:
            smooth timeline editing, polished packs, local-first projects, premium export logic, AI helpers, and a real desktop setup.
          </p>
          <div className="web-hero-actions">
            <a className="primary-button" href="../App/release/Edify%20Setup%200.1.0.exe" download>
              <Download size={16} />
              Download Edify for Windows
            </a>
            <button className="secondary-button" type="button" onClick={onOpenEditor}>
              <Play size={16} />
              Edit in Web
            </button>
          </div>
          <div className="web-stat-row">
            <div><strong>30+</strong><span>core systems</span></div>
            <div><strong>60+</strong><span>transitions</span></div>
            <div><strong>100+</strong><span>sound items</span></div>
            <div><strong>Premium</strong><span>packs & exports</span></div>
          </div>
        </div>
      </section>

      <section className="web-band">
        <div className="web-band-inner web-highlight-grid">
          {productHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <article className="web-highlight-card" key={item.title}>
                <Icon size={18} />
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      {featureBands.map((band) => (
        <section className="web-showcase-band" key={band.title}>
          <div className="web-band-inner web-showcase-layout">
            <div className="web-showcase-copy">
              <span className="web-kicker">{band.kicker}</span>
              <h2>{band.title}</h2>
              <p>{band.detail}</p>
              <button className="secondary-button" type="button" onClick={onOpenEditor}>
                <ArrowRight size={16} />
                Open the web editor
              </button>
            </div>
            <img className="web-showcase-image" src={band.image} alt={band.title} />
          </div>
        </section>
      ))}

      <section className="web-band" id="premium">
        <div className="web-band-inner">
          <div className="web-section-head">
            <span className="web-kicker">Premium Studio</span>
            <h2>Premium packs clearly organized inside the product.</h2>
            <p>Show the plans, the benefits, the exports, and the locked previews right on the website before users open the editor.</p>
          </div>
          <div className="web-plan-grid">
            {premiumPlans.map((plan, index) => (
              <article className={`web-plan-card ${index === 2 ? 'featured' : ''}`} key={plan.name}>
                <span className="web-plan-badge">{plan.badge}</span>
                <h3>{plan.name}</h3>
                <div className="web-plan-price">
                  <strong>{plan.price}</strong>
                  <span>/ month</span>
                </div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Sparkles size={14} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="web-band web-band-cta">
        <div className="web-band-inner web-cta-layout">
          <div>
            <span className="web-kicker">Try Edify now</span>
            <h2>Download the desktop app or open the editor in your browser.</h2>
            <p>Use the Windows setup for the full desktop experience, or jump straight into the web editor to explore the same interface.</p>
          </div>
          <div className="web-hero-actions">
            <a className="primary-button" href="../App/release/Edify%20Setup%200.1.0.exe" download>
              <Download size={16} />
              Download Setup
            </a>
            <button className="secondary-button" type="button" onClick={onOpenEditor}>
              <Play size={16} />
              Edit in Web
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
