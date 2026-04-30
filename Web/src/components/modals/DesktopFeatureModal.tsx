import { AlertTriangle, Download, X } from 'lucide-react';

type DesktopFeatureModalProps = {
  title: string;
  detail: string;
  onClose: () => void;
};

export function DesktopFeatureModal({ title, detail, onClose }: DesktopFeatureModalProps) {
  return (
    <div className="modal-scrim">
      <section className="modal desktop-feature-modal">
        <header className="desktop-feature-header">
          <div className="dialog-icon desktop-feature-icon">
            <AlertTriangle size={20} />
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={17} />
          </button>
        </header>

        <div className="desktop-feature-copy">
          <span className="desktop-feature-kicker">Desktop App Required</span>
          <h2>{title}</h2>
          <p>{detail}</p>
          <p>This feature is available in the Edify desktop application for Windows.</p>
          <p>Please download Edify to unlock the full desktop workflow for this tool.</p>
        </div>

        <div className="desktop-feature-actions">
          <a
            className="primary-button"
            href="../App/release/Edify%20Setup%200.1.0.exe"
            download="Edify Setup 0.1.0.exe"
          >
            <Download size={16} />
            Download Edify
          </a>
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
