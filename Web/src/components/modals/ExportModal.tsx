import { CheckCircle2, Crown, Download, FileVideo, FolderOpen, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { edifyApi } from '../../lib/bridge';
import { scanProject } from '../../lib/moderation';
import { exportPresets } from '../../lib/presets';
import { formatTime } from '../../lib/format';
import { hasAnyPremium, hasUltraExport, loadPremiumAccess, type PremiumAccess } from '../../lib/premium';
import { PremiumOfferModal } from './PremiumOfferModal';
import type { ProjectDocument, Toast } from '../../types/edify';

type ExportModalProps = {
  project: ProjectDocument;
  onClose: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

type ExportProgress = {
  jobId: string;
  progress: number;
  outputPath: string;
  state: 'rendering' | 'complete' | 'failed';
};

type ExportHistoryItem = {
  id: string;
  fileName: string;
  quality: string;
  createdAt: string;
  outputPath: string;
};

type ExportFormat = 'mp4' | 'mov' | 'webm';
type ExportQuality = 'Low' | 'Medium' | 'High' | 'Ultra';

function cleanFileTitle(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim() || 'Edify Export';
}

function parseMbps(value: string) {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
}

function extensionForFormat(format: ExportFormat) {
  return format;
}

function loadExportHistory(): ExportHistoryItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('edify-export-history') ?? '[]') as ExportHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function ExportModal({ project, onClose, pushToast }: ExportModalProps) {
  const defaultPreset = exportPresets.find((preset) => preset.id === '1080p') ?? exportPresets[1];
  const [selectedPreset, setSelectedPreset] = useState(defaultPreset);
  const [fileTitle, setFileTitle] = useState(cleanFileTitle(project.name));
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [resolution, setResolution] = useState(defaultPreset.resolution);
  const [fps, setFps] = useState(defaultPreset.fps);
  const [bitrate, setBitrate] = useState(defaultPreset.bitrate);
  const [quality, setQuality] = useState<ExportQuality>(defaultPreset.quality);
  const [codec, setCodec] = useState('H.264');
  const [audioCodec, setAudioCodec] = useState('AAC 320 kbps');
  const [range, setRange] = useState('Full timeline');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [burnCaptions, setBurnCaptions] = useState(false);
  const [openAfterExport, setOpenAfterExport] = useState(true);
  const [outputPath, setOutputPath] = useState('');
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess>(() => loadPremiumAccess());
  const [showPremiumOffer, setShowPremiumOffer] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>(() => loadExportHistory());
  const [reviewAccepted, setReviewAccepted] = useState(false);

  const fileName = useMemo(() => `${cleanFileTitle(fileTitle)}.${extensionForFormat(format)}`, [fileTitle, format]);
  const reviewReport = useMemo(() => scanProject(project), [project]);
  const blockingIssues = reviewReport.issues.filter((issue) => issue.tone === 'danger');
  const estimatedSizeMb = useMemo(() => {
    const videoMb = (Math.max(1, project.duration) * parseMbps(bitrate)) / 8;
    const audioMb = includeAudio ? (Math.max(1, project.duration) * 0.32) / 8 : 0;
    return Math.max(1, Math.round(videoMb + audioMb));
  }, [bitrate, includeAudio, project.duration]);

  const outputPreview = outputPath || `Choose location... / ${fileName}`;
  const needsPremiumExport = useMemo(() => {
    const mbps = parseMbps(bitrate);
    const isUltra = quality === 'Ultra' || resolution === '3840 x 2160' || mbps >= 50 || fps >= 60;
    const isAdvancedCodec = codec !== 'H.264' || format !== 'mp4';
    return isUltra || isAdvancedCodec;
  }, [bitrate, codec, format, fps, quality, resolution]);
  const exportAllowed = !needsPremiumExport || hasAnyPremium(premiumAccess) || hasUltraExport(premiumAccess);
  const hasPremiumPlan = hasAnyPremium(premiumAccess) || hasUltraExport(premiumAccess);

  useEffect(() => {
    return edifyApi.onExportProgress((payload: unknown) => {
      const next = payload as ExportProgress;
      setProgress(next);
      if (next.state === 'complete') {
        const historyItem: ExportHistoryItem = {
          id: `export-${Date.now()}`,
          fileName,
          quality: `${resolution} - ${fps}fps - ${quality}`,
          createdAt: new Date().toISOString(),
          outputPath: next.outputPath
        };
        setExportHistory((current) => {
          const merged = [historyItem, ...current].slice(0, 4);
          localStorage.setItem('edify-export-history', JSON.stringify(merged));
          return merged;
        });
        pushToast({ title: 'Export complete', detail: next.outputPath, tone: 'success' });
        if (openAfterExport) {
          void edifyApi.showItemInFolder(next.outputPath);
        }
      }
      if (next.state === 'failed') {
        pushToast({ title: 'Export failed', detail: next.outputPath, tone: 'danger' });
      }
    });
  }, [fileName, fps, openAfterExport, pushToast, quality, resolution]);

  const applyPreset = (preset: typeof exportPresets[number]) => {
    setSelectedPreset(preset);
    setResolution(preset.resolution);
    setFps(preset.fps);
    setBitrate(preset.bitrate);
    setQuality(preset.quality);
  };

  const chooseExportPath = async () => {
    const result = await edifyApi.chooseExportPath?.({ fileName, format });
    if (!result?.canceled && result.filePath) {
      setOutputPath(result.filePath);
    }
  };

  const startExport = async () => {
    if (blockingIssues.length > 0 && !reviewAccepted) {
      pushToast({ title: 'Review before export', detail: `${blockingIssues.length} danger item${blockingIssues.length > 1 ? 's' : ''} need confirmation.`, tone: 'warning' });
      return;
    }
    if (!exportAllowed) {
      setShowPremiumOffer(true);
      pushToast({ title: 'Premium export', detail: 'High quality export requires an Edify Premium plan.', tone: 'info' });
      return;
    }
    setIsStarting(true);
    const result = await edifyApi.startExport({
      projectName: project.name,
      preset: selectedPreset.id,
      fileName,
      outputPath,
      format,
      resolution,
      fps,
      bitrate,
      quality,
      codec,
      audioCodec,
      range,
      includeAudio,
      burnCaptions,
      estimatedSizeMb,
      watermark: !hasPremiumPlan,
      project
    });
    setIsStarting(false);
    if (!result?.canceled) {
      setProgress({
        jobId: result.jobId,
        outputPath: result.outputPath,
        progress: 1,
        state: 'rendering'
      });
    }
  };

  return (
    <div className="modal-scrim">
      <section className="modal export-modal">
        <header className="modal-header">
          <div>
            <h2>Export Video</h2>
            <p>Choose the file name, save location, format, quality, and render settings.</p>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>

        <div className="export-grid">
          {exportPresets.map((preset) => (
            <button
              className={`export-preset export-preset-${preset.id} ${selectedPreset.id === preset.id ? 'active' : ''}`}
              key={preset.id}
              onClick={() => applyPreset(preset)}
            >
              <span className="export-preset-visual" aria-hidden="true"><i /></span>
              <strong>{preset.label}</strong>
              <span>{preset.resolution}</span>
              <small>{preset.fps}fps - {preset.bitrate} - {preset.quality}</small>
              {(preset.quality === 'Ultra' || preset.fps >= 60) && <em className="export-premium-chip"><Crown size={11} /> Premium</em>}
            </button>
          ))}
        </div>

        {needsPremiumExport && (
          <div className={`export-premium-banner ${exportAllowed ? 'is-active' : ''}`}>
            <Crown size={17} />
            <div>
              <strong>{exportAllowed ? 'Premium export enabled' : 'Premium quality export'}</strong>
              <span>{exportAllowed ? 'Your current plan can export this quality.' : 'Ultra, 4K, 60fps, MOV/WebM, and high bitrate exports need Premium.'}</span>
            </div>
            {!exportAllowed && <button className="secondary-button" onClick={() => setShowPremiumOffer(true)}>Acheter Premium</button>}
          </div>
        )}

        <div className={`export-license-banner ${hasPremiumPlan ? 'premium' : 'free'}`}>
          <Crown size={17} />
          <div>
            <strong>{hasPremiumPlan ? 'Premium render path' : 'Free render path'}</strong>
            <span>{hasPremiumPlan ? 'Exports are watermark-free with premium quality options.' : 'Free exports work locally and include a small Edify watermark.'}</span>
          </div>
          {!hasPremiumPlan && <button className="secondary-button" onClick={() => setShowPremiumOffer(true)}>Remove watermark</button>}
        </div>

        <section className={`export-review-banner review-${reviewReport.score >= 80 ? 'good' : reviewReport.score >= 55 ? 'warn' : 'danger'}`}>
          <div>
            <strong>Review score {reviewReport.score}/100</strong>
            <span>{reviewReport.summary.danger} danger - {reviewReport.summary.warning} warning - {reviewReport.summary.premium} premium helper</span>
          </div>
          {blockingIssues.length > 0 && (
            <label className="export-check">
              <input type="checkbox" checked={reviewAccepted} onChange={(event) => setReviewAccepted(event.target.checked)} />
              Export anyway
            </label>
          )}
          <div className="export-review-list">
            {reviewReport.issues.filter((issue) => issue.tone !== 'ok').slice(0, 4).map((issue) => (
              <span className={`review-pill pill-${issue.tone}`} key={issue.id}>{issue.title}</span>
            ))}
            {reviewReport.issues.filter((issue) => issue.tone !== 'ok').length === 0 && <span className="review-pill pill-ok">Publish-ready</span>}
          </div>
        </section>

        <div className="export-form">
          <section className="export-card export-file-card">
            <h3><FileVideo size={15} /> File</h3>
            <label>
              Title
              <input value={fileTitle} onChange={(event) => setFileTitle(event.target.value)} placeholder="My edit" />
            </label>
            <label>
              Save as
              <div className="export-path-row">
                <output title={outputPreview}>{outputPreview}</output>
                <button className="secondary-button" onClick={chooseExportPath}>
                  <FolderOpen size={15} />
                  Choose
                </button>
              </div>
            </label>
            <div className="export-summary-strip">
              <span>{fileName}</span>
              <strong>{estimatedSizeMb} MB est.</strong>
            </div>
          </section>

          <section className="export-card">
            <h3>Video</h3>
            <label>
              Format
              <select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
                <option value="mp4">MP4 / H.264</option>
                <option value="mov">MOV / ProRes-ready</option>
                <option value="webm">WebM / VP9-ready</option>
              </select>
            </label>
            <label>
              Resolution
              <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
                <option>1280 x 720</option>
                <option>1920 x 1080</option>
                <option>2560 x 1440</option>
                <option>3840 x 2160</option>
                <option>{project.settings.resolution.width} x {project.settings.resolution.height}</option>
              </select>
            </label>
            <label>
              FPS
              <select value={fps} onChange={(event) => setFps(Number(event.target.value))}>
                <option value={24}>24</option>
                <option value={25}>25</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={60}>60</option>
              </select>
            </label>
            <label>
              Bitrate
              <select value={bitrate} onChange={(event) => setBitrate(event.target.value)}>
                <option>8 Mbps</option>
                <option>16 Mbps</option>
                <option>25 Mbps</option>
                <option>35 Mbps</option>
                <option>50 Mbps</option>
                <option>70 Mbps</option>
              </select>
            </label>
            <label>
              Quality
              <select value={quality} onChange={(event) => setQuality(event.target.value as ExportQuality)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Ultra</option>
              </select>
            </label>
            <label>
              Codec
              <select value={codec} onChange={(event) => setCodec(event.target.value)}>
                <option>H.264</option>
                <option>HEVC-ready</option>
                <option>ProRes-ready</option>
                <option>VP9-ready</option>
              </select>
            </label>
          </section>

          <section className="export-card">
            <h3>Range and audio</h3>
            <label>
              Range
              <select value={range} onChange={(event) => setRange(event.target.value)}>
                <option>Full timeline</option>
                <option>Selected clip</option>
                <option>Work area</option>
              </select>
            </label>
            <label>
              Audio
              <select value={audioCodec} onChange={(event) => setAudioCodec(event.target.value)}>
                <option>AAC 320 kbps</option>
                <option>AAC 192 kbps</option>
                <option>PCM-ready</option>
                <option>No audio</option>
              </select>
            </label>
            <label className="export-check">
              <input type="checkbox" checked={includeAudio} onChange={(event) => setIncludeAudio(event.target.checked)} />
              Include audio tracks
            </label>
            <label className="export-check">
              <input type="checkbox" checked={burnCaptions} onChange={(event) => setBurnCaptions(event.target.checked)} />
              Burn captions into video
            </label>
            <label className="export-check">
              <input type="checkbox" checked={openAfterExport} onChange={(event) => setOpenAfterExport(event.target.checked)} />
              Open folder when finished
            </label>
          </section>

          <section className="export-card export-summary-card">
            <h3>Summary</h3>
            <dl>
              <div><dt>Duration</dt><dd>{formatTime(project.duration)}</dd></div>
              <div><dt>Output</dt><dd>{format.toUpperCase()}</dd></div>
              <div><dt>Resolution</dt><dd>{resolution}</dd></div>
              <div><dt>Frame rate</dt><dd>{fps} fps</dd></div>
              <div><dt>Bitrate</dt><dd>{bitrate}</dd></div>
              <div><dt>Estimated size</dt><dd>{estimatedSizeMb} MB</dd></div>
              <div><dt>Watermark</dt><dd>{hasPremiumPlan ? 'No' : 'Free badge'}</dd></div>
            </dl>
          </section>
        </div>

        {exportHistory.length > 0 && (
          <section className="export-history">
            <h3>Recent exports</h3>
            <div>
              {exportHistory.map((item) => (
                <button key={item.id} onClick={() => void edifyApi.showItemInFolder(item.outputPath)}>
                  <span>
                    <strong>{item.fileName}</strong>
                    <small>{item.quality}</small>
                  </span>
                  <time>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </button>
              ))}
            </div>
          </section>
        )}

        {progress && (
          <div className="export-progress">
            <div>
              {progress.state === 'complete' ? <CheckCircle2 size={18} /> : progress.state === 'failed' ? <X size={18} /> : <Loader2 className="spin" size={18} />}
              <span>{progress.state === 'complete' ? 'Export complete' : progress.state === 'failed' ? 'Export failed' : 'Rendering timeline'}</span>
              <strong>{progress.progress}%</strong>
            </div>
            <progress value={progress.progress} max={100} />
            <small>{progress.outputPath}</small>
          </div>
        )}

        <footer className="modal-actions">
          {progress?.state === 'complete' && (
            <button className="secondary-button" onClick={() => void edifyApi.showItemInFolder(progress.outputPath)}>
              <FolderOpen size={16} />
              Show in folder
            </button>
          )}
          {progress?.state === 'rendering' ? (
            <button
              className="danger-button"
              onClick={() => {
                void edifyApi.cancelExport(progress.jobId);
                setProgress(null);
              }}
            >
              Cancel export
            </button>
          ) : (
            <button className="primary-button" onClick={startExport} disabled={isStarting}>
              {exportAllowed ? <Download size={16} /> : <Crown size={16} />}
              {isStarting ? 'Preparing' : `Export ${format.toUpperCase()}`}
            </button>
          )}
        </footer>
      </section>
      {showPremiumOffer && (
        <PremiumOfferModal
          reason="Super high quality exports need Premium: Ultra quality, 4K, 60fps, higher bitrate, and advanced formats."
          onClose={() => setShowPremiumOffer(false)}
          onAccessChange={setPremiumAccess}
          pushToast={pushToast}
        />
      )}
    </div>
  );
}
