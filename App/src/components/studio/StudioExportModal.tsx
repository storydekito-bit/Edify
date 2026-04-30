import { Download, FileImage, FileText, Globe, ImageIcon, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildPdfFromStudioProject, rasterizeStudioSvg, renderStudioProjectSvg } from '../../lib/studioExport';
import type { StudioExportFormat, StudioLayer, StudioProject } from '../../types/studio';

type StudioExportModalProps = {
  project: StudioProject;
  primaryLayer?: StudioLayer | null;
  onClose: () => void;
  onSaveBuffer: (payload: { suggestedName: string; extension: string; mimeType: string; buffer: ArrayBuffer }) => Promise<void>;
};

const formats: Array<{ id: StudioExportFormat; label: string; icon: typeof FileImage; mimeType: string; extension: string }> = [
  { id: 'png', label: 'PNG', icon: FileImage, mimeType: 'image/png', extension: 'png' },
  { id: 'jpg', label: 'JPG', icon: ImageIcon, mimeType: 'image/jpeg', extension: 'jpg' },
  { id: 'webp', label: 'WEBP', icon: Globe, mimeType: 'image/webp', extension: 'webp' },
  { id: 'svg', label: 'SVG', icon: FileText, mimeType: 'image/svg+xml', extension: 'svg' },
  { id: 'pdf', label: 'PDF', icon: FileText, mimeType: 'application/pdf', extension: 'pdf' }
];

export function StudioExportModal({ project, primaryLayer, onClose, onSaveBuffer }: StudioExportModalProps) {
  const [format, setFormat] = useState<StudioExportFormat>('png');
  const [quality, setQuality] = useState(0.92);
  const [exportScale, setExportScale] = useState(1);
  const [transparent, setTransparent] = useState(project.canvas.transparent);
  const [scope, setScope] = useState<'full' | 'selected-layer' | 'selected-area'>('full');
  const [isBusy, setIsBusy] = useState(false);

  const selectedFormat = useMemo(() => formats.find((item) => item.id === format)!, [format]);

  return (
    <div className="modal-scrim">
      <div className="modal studio-export-modal">
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">Export</span>
            <h2>Export from Thumbnail Studio</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="studio-export-grid">
          <div className="studio-export-formats">
            {formats.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" className={item.id === format ? 'is-active' : ''} onClick={() => setFormat(item.id)}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="studio-export-controls">
            <label>
              <span>Scope</span>
              <select value={scope} onChange={(event) => setScope(event.target.value as 'full' | 'selected-layer' | 'selected-area')}>
                <option value="full">Full project</option>
                <option value="selected-layer" disabled={!primaryLayer}>Selected layer</option>
                <option value="selected-area" disabled={!primaryLayer}>Selected area</option>
              </select>
            </label>
            <label>
              <span>Resolution scale</span>
              <input type="range" min={1} max={4} step={1} value={exportScale} onChange={(event) => setExportScale(Number(event.target.value))} />
              <small>
                {((scope === 'full' || !primaryLayer) ? project.canvas.width : primaryLayer.width) * exportScale}
                {' x '}
                {((scope === 'full' || !primaryLayer) ? project.canvas.height : primaryLayer.height) * exportScale}
              </small>
            </label>
            {format !== 'svg' && format !== 'pdf' && (
              <label>
                <span>Quality</span>
                <input type="range" min={0.5} max={1} step={0.01} value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
                <small>{Math.round(quality * 100)}%</small>
              </label>
            )}
            <label className="studio-checkbox">
              <input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} disabled={format === 'jpg' || format === 'pdf'} />
              <span>Transparent background</span>
            </label>
          </div>
        </div>

        <div className="studio-export-footer">
          <small>{selectedFormat.label} export · {project.name}</small>
          <button
            className="primary-button"
            type="button"
            disabled={isBusy}
            onClick={async () => {
              setIsBusy(true);
              try {
                const exportProject: StudioProject = (() => {
                  if (!primaryLayer || scope === 'full') {
                    return {
                      ...project,
                      canvas: {
                        ...project.canvas,
                        transparent
                      }
                    };
                  }
                  const isolatedLayer = {
                    ...JSON.parse(JSON.stringify(primaryLayer)),
                    x: 0,
                    y: 0
                  };
                  return {
                    ...project,
                    canvas: {
                      ...project.canvas,
                      width: Math.round(primaryLayer.width),
                      height: Math.round(primaryLayer.height),
                      transparent,
                      zoom: 1,
                      panX: 0,
                      panY: 0,
                      rotation: 0
                    },
                    layers: [isolatedLayer]
                  };
                })();
                const svg = renderStudioProjectSvg(exportProject, { hideSelection: true });
                let buffer: ArrayBuffer;
                if (format === 'svg') {
                  buffer = new TextEncoder().encode(svg).buffer;
                } else if (format === 'pdf') {
                  buffer = await buildPdfFromStudioProject(svg, exportProject.canvas.width * exportScale, exportProject.canvas.height * exportScale);
                } else {
                  buffer = await rasterizeStudioSvg(
                    svg,
                    exportProject.canvas.width * exportScale,
                    exportProject.canvas.height * exportScale,
                    selectedFormat.mimeType as 'image/png' | 'image/jpeg' | 'image/webp',
                    quality
                  );
                }
                await onSaveBuffer({
                  suggestedName: `${project.name} Thumbnail Export`,
                  extension: selectedFormat.extension,
                  mimeType: selectedFormat.mimeType,
                  buffer
                });
                onClose();
              } finally {
                setIsBusy(false);
              }
            }}
          >
            <Download size={15} /> {isBusy ? 'Exporting...' : `Export ${selectedFormat.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
