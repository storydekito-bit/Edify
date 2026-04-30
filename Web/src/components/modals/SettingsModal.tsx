import { Monitor, SlidersHorizontal, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { edifyApi } from '../../lib/bridge';
import type { AppSettings, Toast } from '../../types/edify';

type SettingsModalProps = {
  settings: AppSettings;
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

export function SettingsModal({ settings, onClose, onSettingsChange, pushToast }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  const update = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    const saved = await edifyApi.setSetting(key, value);
    onSettingsChange((saved as AppSettings) ?? next);
    pushToast({ title: 'Settings updated', detail: `${key} saved`, tone: 'success' });
  };

  return (
    <div className="modal-scrim">
      <section className="modal settings-modal">
        <header className="modal-header">
          <div>
            <h2>Settings</h2>
            <p>Performance, preview quality, autosave, and interface scale.</p>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>
        <div className="settings-modal-grid">
          <label>
            <Monitor size={18} />
            Preview quality
            <select value={draft.previewQuality} onChange={(event) => void update('previewQuality', event.target.value as AppSettings['previewQuality'])}>
              <option>Full</option>
              <option>Half</option>
              <option>Quarter</option>
            </select>
          </label>
          <label>
            <SlidersHorizontal size={18} />
            UI scale
            <input type="range" min="0.85" max="1.25" step="0.05" value={draft.uiScale} onChange={(event) => void update('uiScale', Number(event.target.value))} />
            <span>{Math.round(draft.uiScale * 100)}%</span>
          </label>
          <label>
            <Zap size={18} />
            Hardware acceleration
            <input type="checkbox" checked={draft.hardwareAcceleration} onChange={(event) => void update('hardwareAcceleration', event.target.checked)} />
          </label>
          <label>
            Autosave interval
            <select value={draft.autosaveMinutes} onChange={(event) => void update('autosaveMinutes', Number(event.target.value))}>
              <option value={1}>Every minute</option>
              <option value={2}>Every 2 minutes</option>
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
