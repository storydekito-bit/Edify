import { X } from 'lucide-react';

const shortcuts = [
  ['Space', 'Play or pause'],
  ['Ctrl + S', 'Save project'],
  ['Ctrl + Shift + S', 'Save as'],
  ['Ctrl + Z / Ctrl + Y', 'Undo / redo'],
  ['Delete', 'Delete selected clip'],
  ['Ctrl + D', 'Duplicate selected clip'],
  ['S', 'Split clip at playhead'],
  ['+ / -', 'Zoom timeline'],
  ['Arrow keys', 'Move frame by frame'],
  ['Ctrl + MouseWheel', 'Timeline zoom']
];

export function ShortcutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-scrim">
      <section className="modal shortcut-modal">
        <header className="modal-header">
          <div>
            <h2>Keyboard Shortcuts</h2>
            <p>Fast editing commands for desktop workflow.</p>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>
        <div className="shortcut-list">
          {shortcuts.map(([combo, action]) => (
            <div className="shortcut-row" key={combo}>
              <kbd>{combo}</kbd>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
