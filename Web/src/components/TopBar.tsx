import {
  ArrowLeft,
  Crown,
  Download,
  HelpCircle,
  Import,
  RotateCcw,
  RotateCw,
  Save,
  Settings,
  Share2,
  Minus,
  X,
  Zap
} from 'lucide-react';
import { edifyApi } from '../lib/bridge';
import type { BootstrapInfo, ProjectDocument, SaveStatus } from '../types/edify';

type TopBarProps = {
  project: ProjectDocument;
  saveStatus: SaveStatus;
  bootstrap: BootstrapInfo | null;
  canUndo: boolean;
  canRedo: boolean;
  onBackHome: () => void;
  onImportMedia: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShortcuts: () => void;
  onSettings: () => void;
  onPremium: () => void;
};

const statusLabels: Record<SaveStatus, string> = {
  saved: 'Saved',
  dirty: 'Unsaved changes',
  saving: 'Saving',
  autosaved: 'Autosaved',
  offline: 'Local only'
};

export function TopBar({
  project,
  saveStatus,
  bootstrap,
  canUndo,
  canRedo,
  onBackHome,
  onImportMedia,
  onSave,
  onSaveAs,
  onExport,
  onUndo,
  onRedo,
  onShortcuts,
  onSettings,
  onPremium
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-left">
        <button className="icon-button" onClick={onBackHome} title="Home">
          <ArrowLeft size={17} />
        </button>
        <div className="brand-lockup">
          <span className="brand-mark">E</span>
          <span>Edify</span>
        </div>
        <div className="project-title">
          <strong>{project.name}</strong>
          <small>{project.settings.resolution.width}x{project.settings.resolution.height} / {project.settings.fps}fps</small>
        </div>
        <span className={`save-status status-${saveStatus}`}>
          <span />
          {statusLabels[saveStatus]}
        </span>
      </div>

      <div className="top-center">
        <button className="icon-button" onClick={onUndo} disabled={!canUndo} title="Undo">
          <RotateCcw size={17} />
        </button>
        <button className="icon-button" onClick={onRedo} disabled={!canRedo} title="Redo">
          <RotateCw size={17} />
        </button>
        <button className="toolbar-button" onClick={onImportMedia}>
          <Import size={16} />
          Import
        </button>
        <button className="toolbar-button" onClick={onSave}>
          <Save size={16} />
          Save
        </button>
        <button className="toolbar-button ghost" onClick={onSaveAs}>
          <Share2 size={16} />
          Save As
        </button>
      </div>

      <div className="top-right">
        <span className="perf-indicator">
          <Zap size={14} />
          {bootstrap?.platform === 'browser' ? 'Preview' : 'GPU ready'}
        </span>
        <button className="icon-button" onClick={onShortcuts} title="Shortcuts">
          <HelpCircle size={17} />
        </button>
        <button className="icon-button" title="Settings" onClick={onSettings}>
          <Settings size={17} />
        </button>
        <button className="toolbar-button premium-top-button" onClick={onPremium}>
          <Crown size={16} />
          Premium
        </button>
        <button className="primary-button small" onClick={onExport}>
          <Download size={16} />
          Export
        </button>
        <div className="window-controls">
          <button onClick={() => void edifyApi.windowMinimize()} title="Minimize">
            <Minus size={17} />
          </button>
          <button className="close-window" onClick={() => void edifyApi.windowClose()} title="Close Edify">
            <X size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
