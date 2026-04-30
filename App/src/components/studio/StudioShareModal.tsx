import { Copy, FileText, ImageIcon, Package2, Share2, X } from 'lucide-react';

type StudioShareModalProps = {
  projectName: string;
  shareSummary: string;
  reviewBrief: string;
  busyAction: 'copy-summary' | 'copy-review' | 'preview' | 'pdf' | 'bundle' | null;
  onClose: () => void;
  onCopySummary: () => Promise<void> | void;
  onCopyReview: () => Promise<void> | void;
  onExportPreview: () => Promise<void> | void;
  onExportPdf: () => Promise<void> | void;
  onSaveBundle: () => Promise<void> | void;
};

export function StudioShareModal({
  projectName,
  shareSummary,
  reviewBrief,
  busyAction,
  onClose,
  onCopySummary,
  onCopyReview,
  onExportPreview,
  onExportPdf,
  onSaveBundle
}: StudioShareModalProps) {
  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <section className="modal studio-share-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">Share</span>
            <h2>Share Thumbnail Studio project</h2>
            <p>Export handoff files, copy a clean project summary, or save a portable bundle for this thumbnail.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="studio-share-copy">
          <article className="studio-share-copy-block">
            <strong>Project summary</strong>
            <pre>{shareSummary}</pre>
          </article>
          <article className="studio-share-copy-block">
            <strong>Review handoff</strong>
            <pre>{reviewBrief}</pre>
          </article>
        </div>

        <div className="studio-share-grid">
          <button className="studio-share-card" type="button" onClick={() => void onCopySummary()} disabled={busyAction !== null}>
            <Copy size={18} />
            <span>
              <strong>{busyAction === 'copy-summary' ? 'Copying...' : 'Copy project summary'}</strong>
              <small>Copy a clean summary with project size, visible layers, theme, and update date.</small>
            </span>
          </button>

          <button className="studio-share-card" type="button" onClick={() => void onCopyReview()} disabled={busyAction !== null}>
            <Share2 size={18} />
            <span>
              <strong>{busyAction === 'copy-review' ? 'Copying...' : 'Copy review handoff'}</strong>
              <small>Copy a client-ready review note with next steps, file info, and premium-ready notes.</small>
            </span>
          </button>

          <button className="studio-share-card" type="button" onClick={() => void onExportPreview()} disabled={busyAction !== null}>
            <ImageIcon size={18} />
            <span>
              <strong>{busyAction === 'preview' ? 'Exporting preview...' : 'Export share preview PNG'}</strong>
              <small>Save a clean PNG review preview of the visible thumbnail canvas.</small>
            </span>
          </button>

          <button className="studio-share-card" type="button" onClick={() => void onExportPdf()} disabled={busyAction !== null}>
            <FileText size={18} />
            <span>
              <strong>{busyAction === 'pdf' ? 'Exporting PDF...' : 'Export review PDF'}</strong>
              <small>Save a review-ready PDF snapshot for quick client handoff or approvals.</small>
            </span>
          </button>

          <button className="studio-share-card studio-share-card--wide" type="button" onClick={() => void onSaveBundle()} disabled={busyAction !== null}>
            <Package2 size={18} />
            <span>
              <strong>{busyAction === 'bundle' ? 'Saving bundle...' : 'Save share bundle'}</strong>
              <small>Save a portable `.edify-share.json` style package with the full project state, summary, and review data.</small>
            </span>
          </button>
        </div>

        <div className="studio-share-footer">
          <small>{projectName} · local share tools inside Edify</small>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
