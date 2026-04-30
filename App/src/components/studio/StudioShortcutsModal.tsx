import { X } from 'lucide-react';

const sections: Array<{ title: string; shortcuts: Array<[string, string]> }> = [
  {
    title: 'File',
    shortcuts: [
      ['Ctrl + N', 'New project'],
      ['Ctrl + O', 'Open / import image'],
      ['Ctrl + S', 'Save project'],
      ['Ctrl + Shift + S', 'Save as'],
      ['Ctrl + E', 'Export'],
      ['Ctrl + P', 'Export PDF'],
      ['Ctrl + W', 'Close project']
    ]
  },
  {
    title: 'Edit',
    shortcuts: [
      ['Ctrl + Z', 'Undo'],
      ['Ctrl + Shift + Z / Ctrl + Y', 'Redo'],
      ['Ctrl + C', 'Copy selected layers'],
      ['Ctrl + V', 'Paste layers'],
      ['Ctrl + X', 'Cut selection'],
      ['Delete', 'Delete selected layers'],
      ['Ctrl + A', 'Select all'],
      ['Ctrl + D', 'Deselect'],
      ['Ctrl + J', 'Duplicate selection'],
      ['Ctrl + G', 'Group selected layers'],
      ['Ctrl + Shift + G', 'Ungroup']
    ]
  },
  {
    title: 'Tools',
    shortcuts: [
      ['V', 'Move tool'],
      ['M', 'Rectangle selection'],
      ['L', 'Lasso'],
      ['W', 'Magic wand'],
      ['C', 'Crop'],
      ['B', 'Brush'],
      ['E', 'Eraser'],
      ['G', 'Fill / gradient'],
      ['I', 'Eyedropper'],
      ['T', 'Text'],
      ['U', 'Shape tools'],
      ['P', 'Pen'],
      ['S', 'Clone stamp'],
      ['H', 'Hand / pan'],
      ['Z', 'Zoom'],
      ['R', 'Rotate canvas']
    ]
  },
  {
    title: 'View + Layers',
    shortcuts: [
      ['Ctrl + Plus / Minus', 'Zoom in / out'],
      ['Ctrl + 0', 'Fit to screen'],
      ['Ctrl + 1', '100% zoom'],
      ["Ctrl + '", 'Toggle grid'],
      ['Ctrl + ;', 'Toggle guides'],
      ['Ctrl + R', 'Toggle rulers'],
      ['F', 'Toggle preview mode'],
      ['Alt + ] / Alt + [', 'Select layer above / below'],
      ['Ctrl + ] / Ctrl + [', 'Move layer up / down'],
      ['Ctrl + Shift + ] / [', 'Bring to front / send to back'],
      ['Ctrl + Alt + G', 'Clipping mask'],
      ['Ctrl + I', 'Invert mask / adjustments']
    ]
  },
  {
    title: 'Brush',
    shortcuts: [
      ['[ / ]', 'Brush size down / up'],
      ['Shift + [ / ]', 'Brush hardness down / up'],
      ['1-9', 'Brush opacity 10% to 90%'],
      ['0', 'Brush opacity 100%'],
      ['Ctrl + K', 'Command palette']
    ]
  }
];

export function StudioShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-scrim">
      <section className="modal studio-shortcuts-modal">
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">Keyboard</span>
            <h2>Thumbnail Studio shortcuts</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </header>
        <div className="studio-shortcuts-scroll">
          <div className="studio-shortcuts-grid">
            {sections.map((section) => (
              <article key={section.title} className="studio-shortcuts-card">
                <strong>{section.title}</strong>
                <div className="studio-shortcuts-list">
                  {section.shortcuts.map(([combo, detail]) => (
                    <div className="studio-shortcut-row" key={combo}>
                      <kbd>{combo}</kbd>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
