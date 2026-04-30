import { BookOpen, Move, Sparkles, Wand2, X } from 'lucide-react';

type StudioTutorialModalProps = {
  onClose: () => void;
};

export function StudioTutorialModal({ onClose }: StudioTutorialModalProps) {
  return (
    <div className="modal-scrim">
      <div className="modal studio-tutorial-modal">
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">First launch</span>
            <h2>Welcome to Thumbnail Studio</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="studio-tutorial-grid">
          <article>
            <Move size={18} />
            <strong>Move, resize, and rotate</strong>
            <span>Select a layer, drag it on the artboard, or use the properties panel for precise edits.</span>
          </article>
          <article>
            <BookOpen size={18} />
            <strong>Layer-first workflow</strong>
            <span>Every imported image, title, shape, adjustment, and AI result becomes its own editable layer.</span>
          </article>
          <article>
            <Sparkles size={18} />
            <strong>Creator export presets</strong>
            <span>Quickly switch to YouTube, Discord, Roblox, Instagram, and TikTok dimensions.</span>
          </article>
          <article>
            <Wand2 size={18} />
            <strong>AI stays non-destructive</strong>
            <span>Generative actions create new result layers, so your original image is always preserved underneath.</span>
          </article>
        </div>
        <div className="studio-tutorial-footer">
          <button className="primary-button" type="button" onClick={onClose}>Start editing</button>
        </div>
      </div>
    </div>
  );
}
