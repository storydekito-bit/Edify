import { Command, Download, Keyboard, MoonStar, Redo2, Save, Search, Share2, SunMedium, Undo2, UserRound, ZoomIn } from 'lucide-react';
import type { DesktopAccountUser } from '../../types/edify';
import type { StudioTheme } from '../../types/studio';

type StudioTopbarProps = {
  projectName: string;
  zoomPercent: number;
  theme: StudioTheme;
  searchValue: string;
  accountUser?: DesktopAccountUser | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
  onShare: () => void;
  onToggleTheme: () => void;
  onOpenAccount: () => void;
  onSearchChange: (value: string) => void;
  onOpenCommands: () => void;
  onOpenShortcuts: () => void;
};

export function StudioTopbar({
  projectName,
  zoomPercent,
  theme,
  searchValue,
  accountUser,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onExport,
  onShare,
  onToggleTheme,
  onOpenAccount,
  onSearchChange,
  onOpenCommands,
  onOpenShortcuts
}: StudioTopbarProps) {
  return (
    <header className="studio-topbar">
      <div className="studio-topbar-left">
        <div className="brand-mark">E</div>
        <div className="studio-topbar-copy">
          <strong>Thumbnail Studio</strong>
          <small>{projectName}</small>
        </div>
      </div>

      <div className="studio-topbar-center">
        <label className="studio-topbar-search">
          <Search size={14} />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tools, filters, layers, commands..."
          />
        </label>
        <button className="secondary-button" type="button" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={15} /> Undo
        </button>
        <button className="secondary-button" type="button" onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={15} /> Redo
        </button>
        <button className="secondary-button" type="button" onClick={onSave}>
          <Save size={15} /> Save
        </button>
        <button className="primary-button" type="button" onClick={onExport}>
          <Download size={15} /> Export
        </button>
      </div>

      <div className="studio-topbar-right">
        <button className="secondary-button" type="button" onClick={onOpenCommands}>
          <Command size={15} /> Command
        </button>
        <button className="secondary-button" type="button" onClick={onOpenShortcuts}>
          <Keyboard size={15} /> Shortcuts
        </button>
        <button className="secondary-button" type="button" onClick={onShare}>
          <Share2 size={15} /> Share
        </button>
        <span className="studio-topbar-zoom">
          <ZoomIn size={14} />
          {zoomPercent}%
        </span>
        <button className="icon-button" type="button" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
        </button>
        <button className="studio-account-pill" type="button" onClick={onOpenAccount}>
          <UserRound size={15} />
          <span>{accountUser?.email || 'Account'}</span>
        </button>
      </div>
    </header>
  );
}
