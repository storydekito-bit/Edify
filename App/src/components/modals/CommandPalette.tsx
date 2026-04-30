import { Command, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type CommandAction = {
  id: string;
  label: string;
  detail: string;
  shortcut?: string;
  run: () => void;
};

type CommandPaletteProps = {
  actions: CommandAction[];
  onClose: () => void;
};

export function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter((action) =>
      `${action.label} ${action.detail} ${action.shortcut ?? ''}`.toLowerCase().includes(normalized)
    );
  }, [actions, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-scrim command-scrim" onMouseDown={onClose}>
      <section className="command-palette" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <Command size={18} />
          <strong>Command Center</strong>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </header>
        <label className="command-search">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions, tools, panels..."
          />
        </label>
        <div className="command-scroll">
          <div className="command-list">
            {filteredActions.map((action) => (
              <button
                className="command-item"
                key={action.id}
                onClick={() => {
                  action.run();
                  onClose();
                }}
              >
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.detail}</small>
                </span>
                {action.shortcut && <kbd>{action.shortcut}</kbd>}
              </button>
            ))}
            {filteredActions.length === 0 && <div className="empty-state compact">No command found.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
