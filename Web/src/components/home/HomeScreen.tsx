import { Bot, BrainCircuit, Cpu, Crown, FolderOpen, Import, LayoutTemplate, Mic2, Minus, Music2, Plus, Rocket, ShieldCheck, ShoppingBag, Sparkles, Video, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import { edifyApi } from '../../lib/bridge';
import type { BootstrapInfo, PanelId, ProjectSummary } from '../../types/edify';

type HomeScreenProps = {
  recentProjects: ProjectSummary[];
  bootstrap: BootstrapInfo | null;
  onNewProject: (name?: string) => void;
  onOpenProject: () => void;
  onOpenRecent: (path: string) => void;
  onRenameRecent: (project: ProjectSummary) => void;
  onDeleteRecent: (project: ProjectSummary) => void;
  onImportMedia: () => void;
  onOpenPremium: () => void;
  onOpenPanel: (panel: PanelId) => void;
  onDropFiles: (files: FileList | File[]) => void;
  onPreviewError?: () => void;
};

const templates = ['Cinematic Reel', 'Gaming Highlight', 'Podcast Clip', 'Product Launch', 'Chill Vlog', 'Shorts Caption Pack'];
const dashboardCards: Array<{ title: string; detail: string; icon: typeof Rocket; panel: PanelId }> = [
  { title: 'Quick Edit', detail: 'One-click styles', icon: Rocket, panel: 'quick' },
  { title: 'Assistant', detail: 'Fix, score, optimize', icon: BrainCircuit, panel: 'assistant' },
  { title: 'AI Lab', detail: 'Captions and helpers', icon: Bot, panel: 'ai' },
  { title: 'Voice Studio', detail: 'Record and clean audio', icon: Mic2, panel: 'voice' },
  { title: 'Sound Library', detail: 'Chill music and SFX', icon: Music2, panel: 'sounds' },
  { title: 'Render Engine', detail: 'MP4 and preview cache', icon: Cpu, panel: 'render' },
  { title: 'Review', detail: 'Safety before export', icon: ShieldCheck, panel: 'moderation' },
  { title: 'Pack Store', detail: 'Free and Premium packs', icon: ShoppingBag, panel: 'marketplace' }
];

const launchHighlights = [
  { title: 'Magic Edit ready', detail: 'Build a timeline with music, cuts, captions and effects.', icon: Wand2, panel: 'quick' as PanelId },
  { title: 'Chill sound packs', detail: 'LoFi, vlog, coffee shop, study and soft pop loops.', icon: Music2, panel: 'sounds' as PanelId },
  { title: 'Real render path', detail: 'FFmpeg export, audio mix, captions burn and watermark rules.', icon: Cpu, panel: 'render' as PanelId }
];

export function HomeScreen({
  recentProjects,
  bootstrap,
  onNewProject,
  onOpenProject,
  onOpenRecent,
  onRenameRecent,
  onDeleteRecent,
  onImportMedia,
  onOpenPremium,
  onOpenPanel,
  onDropFiles,
  onPreviewError
}: HomeScreenProps) {
  const [recentMenu, setRecentMenu] = useState<{ x: number; y: number; project: ProjectSummary } | null>(null);

  return (
    <main
      className="home-screen"
      onClick={() => setRecentMenu(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropFiles(event.dataTransfer.files);
      }}
    >
      <div className="home-ambient" />
      <div className="home-window-controls">
        <button onClick={() => void edifyApi.windowMinimize()} title="Minimize">
          <Minus size={17} />
        </button>
        <button className="close-window" onClick={() => void edifyApi.windowClose()} title="Close Edify">
          <X size={17} />
        </button>
      </div>
      <section className="home-hero">
        <div className="brand-mark large">E</div>
        <div>
          <h1>Edify</h1>
          <p>Local-first video editing, engineered for sharp cuts, clean timelines, and fast creative flow.</p>
        </div>
      </section>

      <section className="home-dashboard-strip">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <button className="home-dashboard-card" key={card.title} onClick={() => onOpenPanel(card.panel)}>
              <Icon size={18} />
              <span>
                <strong>{card.title}</strong>
                <small>{card.detail}</small>
              </span>
            </button>
          );
        })}
      </section>

      <section className="home-studio-strip">
        {launchHighlights.map((item) => {
          const Icon = item.icon;
          return (
            <button className="home-studio-card" key={item.title} onClick={() => onOpenPanel(item.panel)}>
              <Icon size={18} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
            </button>
          );
        })}
        <div className="home-studio-meter">
          <span>Startup kit</span>
          <strong>30+ systems</strong>
          <small>Templates, premium, voice, review, render, captions</small>
        </div>
      </section>

      <section className="home-grid">
        <div className="home-actions">
          <button className="home-action primary" onClick={() => onNewProject('Untitled Edit')}>
            <Plus size={22} />
            <span>New Project</span>
          </button>
          <button className="home-action" onClick={onOpenProject}>
            <FolderOpen size={22} />
            <span>Open Project</span>
          </button>
          <button className="home-action" onClick={onImportMedia}>
            <Import size={22} />
            <span>Import Media</span>
          </button>
          <button className="home-action premium-home-action" onClick={onOpenPremium}>
            <Crown size={22} />
            <span>Premium Studio</span>
          </button>
          {onPreviewError ? (
            <button className="home-action error-preview-action" onClick={onPreviewError}>
              <ShieldCheck size={22} />
              <span>Error Preview</span>
            </button>
          ) : null}
        </div>

        <div className="drop-zone">
          <Video size={34} />
          <strong>Drop footage here</strong>
          <span>Videos, audio, images, and existing .edify project files stay local on this machine.</span>
        </div>

        <div className="home-panel recent-panel">
          <div className="panel-heading">
            <span>Recent Projects</span>
            <small>{bootstrap?.paths.projects ?? 'Edify Projects'}</small>
          </div>
          <div className="recent-list">
            {recentProjects.length === 0 ? (
              <div className="empty-state compact">
                <Sparkles size={18} />
                <span>Your recent projects will appear here after the first save.</span>
              </div>
            ) : (
              recentProjects.map((project) => (
                <button
                  className="recent-item"
                  key={project.path}
                  onClick={() => onOpenRecent(project.path)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setRecentMenu({ x: event.clientX, y: event.clientY, project });
                  }}
                >
                  <span className="recent-thumb" />
                  <span>
                    <strong>{project.name}</strong>
                    <small>{new Date(project.updatedAt).toLocaleString()}</small>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="home-panel template-panel">
          <div className="panel-heading">
            <span>Starter Templates</span>
            <small>Ready-to-expand structures</small>
          </div>
          <div className="template-list">
            {templates.map((template, index) => (
              <button
                className="template-card"
                key={template}
                onClick={() => onNewProject(template)}
              >
                <LayoutTemplate size={18} />
                <span>{template}</span>
                <small>{index === 0 ? '16:9, 30fps' : index === 1 ? '9:16, beat cuts' : index === 4 ? 'Chill music + warm grade' : 'Creator preset'}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      {recentMenu && (
        <div className="context-menu home-context-menu" style={{ left: recentMenu.x, top: recentMenu.y }}>
          <button
            onClick={() => {
              onRenameRecent(recentMenu.project);
              setRecentMenu(null);
            }}
          >
            Rename project
          </button>
          <button
            onClick={() => {
              onDeleteRecent(recentMenu.project);
              setRecentMenu(null);
            }}
          >
            Delete project
          </button>
        </div>
      )}
    </main>
  );
}
