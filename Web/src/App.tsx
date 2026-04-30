import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { EditorShell } from './components/EditorShell';
import { AuthGate } from './components/auth/AuthGate';
import { CommandPalette, type CommandAction } from './components/modals/CommandPalette';
import { DesktopFeatureModal } from './components/modals/DesktopFeatureModal';
import { ExportModal } from './components/modals/ExportModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ShortcutModal } from './components/modals/ShortcutModal';
import { ToastStack } from './components/ToastStack';
import { WebLanding } from './components/web/WebLanding';
import { getCurrentUser, type AppwriteUser } from './lib/appwrite';
import { edifyApi } from './lib/bridge';
import { createId } from './lib/id';
import { createDemoProject } from './state/demoProject';
import { useEditorState } from './state/useEditorState';
import type { BootstrapInfo, MediaAsset, PanelId, ProjectDocument, ProjectSummary, Toast } from './types/edify';

type Screen = 'landing' | 'editor';

const autosaveIntervalMs = 1000 * 45;

function browserAssetFromFile(file: File): MediaAsset {
  const lowerName = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  const kind =
    mime.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/.test(lowerName)
      ? 'video'
      : mime.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg)$/.test(lowerName)
        ? 'audio'
        : mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(lowerName)
          ? 'image'
          : 'unknown';

  return {
    id: createId('asset'),
    name: file.name,
    kind,
    path: `browser-file://${file.name}`,
    previewUrl: URL.createObjectURL(file),
    thumbnailUrl: kind === 'image' ? URL.createObjectURL(file) : undefined,
    size: file.size,
    extension: file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() : undefined,
    importedAt: new Date().toISOString(),
    duration: kind === 'image' ? 5 : undefined,
    dimensions: kind === 'image' || kind === 'video' ? { width: 1920, height: 1080 } : undefined
  };
}

async function enrichImportedAsset(asset: MediaAsset): Promise<MediaAsset> {
  if (asset.kind === 'video' || asset.kind === 'audio') {
    return readMediaMetadata(asset);
  }
  if (asset.kind === 'image') {
    return readImageMetadata(asset);
  }
  return asset;
}

function readMediaMetadata(asset: MediaAsset): Promise<MediaAsset> {
  if (!asset.previewUrl) return Promise.resolve(asset);
  const previewUrl = asset.previewUrl;

  return new Promise((resolve) => {
    const media = document.createElement(asset.kind === 'audio' ? 'audio' : 'video');
    let settled = false;
    const finish = (nextAsset: MediaAsset) => {
      if (settled) return;
      settled = true;
      media.onloadedmetadata = null;
      media.onerror = null;
      window.clearTimeout(timeout);
      resolve(nextAsset);
    };
    const timeout = window.setTimeout(() => finish(asset), 5000);

    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : asset.duration;
      const dimensions =
        asset.kind === 'video' && media instanceof HTMLVideoElement && media.videoWidth > 0 && media.videoHeight > 0
          ? { width: media.videoWidth, height: media.videoHeight }
          : asset.dimensions;
      finish({
        ...asset,
        duration,
        dimensions
      });
    };
    media.onerror = () => finish(asset);
    media.src = previewUrl;
  });
}

function readImageMetadata(asset: MediaAsset): Promise<MediaAsset> {
  if (!asset.previewUrl) return Promise.resolve(asset);
  const previewUrl = asset.previewUrl;

  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (nextAsset: MediaAsset) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      window.clearTimeout(timeout);
      resolve(nextAsset);
    };
    const timeout = window.setTimeout(() => finish(asset), 2500);
    image.onload = () => {
      finish({
        ...asset,
        duration: asset.duration ?? 5,
        dimensions: image.naturalWidth > 0 && image.naturalHeight > 0
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : asset.dimensions
      });
    };
    image.onerror = () => finish(asset);
    image.src = previewUrl;
  });
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('editor');
  const [authUser, setAuthUser] = useState<AppwriteUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapInfo | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [desktopFeature, setDesktopFeature] = useState<{ title: string; detail: string } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const editor = useEditorState(useMemo(() => createDemoProject('Edify Demo Reel'), []));

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = createId('toast');
    setToasts((current) => [...current, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    const info = await edifyApi.bootstrap();
    setBootstrap(info);
    setRecentProjects(info.recentProjects);
    setShowRecovery(info.recoveryAvailable);
  }, []);

  const isBrowserMode = bootstrap?.platform === 'browser';

  const openDesktopFeature = useCallback((title: string, detail: string) => {
    setDesktopFeature({ title, detail });
  }, []);

  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    let mounted = true;
    void getCurrentUser()
      .then((user) => {
        if (mounted) setAuthUser(user);
      })
      .catch(() => {
        if (mounted) setAuthUser(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (screen !== 'editor' || editor.saveStatus === 'saved') return;
    const timer = window.setInterval(() => {
      void edifyApi.writeAutosave(editor.project).then(() => editor.setSaveStatus('autosaved'));
    }, autosaveIntervalMs);
    return () => window.clearInterval(timer);
  }, [editor, editor.project, editor.saveStatus, editor.setSaveStatus, screen]);

  useEffect(() => {
    if (!editor.isPlaying) return;
    const startTime = performance.now();
    const startPlayhead = editor.playhead;
    let frame = 0;

    const tick = (now: number) => {
      const nextPlayhead = startPlayhead + (now - startTime) / 1000;
      if (nextPlayhead >= editor.project.duration) {
        editor.setPlayhead(0);
        editor.setPlaying(false);
        return;
      }
      editor.setPlayhead(nextPlayhead);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [editor.isPlaying]);

  const saveProject = useCallback(async (saveAs = false) => {
    editor.setSaveStatus('saving');
    const result = saveAs
      ? await edifyApi.saveProjectAs(editor.project)
      : await edifyApi.saveProject(editor.project, editor.project.path);
    if (!result?.canceled && result.document) {
      editor.setProject(result.document as ProjectDocument, 'saved');
      await refreshBootstrap();
      pushToast({ title: 'Project saved', detail: result.filePath, tone: 'success' });
    } else {
      editor.setSaveStatus('dirty');
    }
  }, [editor, pushToast, refreshBootstrap]);

  const openProjectDialog = useCallback(async () => {
    const result = await edifyApi.openProjectDialog();
    if (!result?.canceled && result.document) {
      editor.setProject(result.document as ProjectDocument, 'saved');
      setScreen('editor');
      await refreshBootstrap();
      pushToast({ title: 'Project opened', detail: (result.document as ProjectDocument).name, tone: 'success' });
    }
  }, [editor, pushToast, refreshBootstrap]);

  const openProjectPath = useCallback(async (projectPath: string) => {
    const result = await edifyApi.openProjectPath(projectPath);
    editor.setProject(result.document as ProjectDocument, 'saved');
    setScreen('editor');
    await refreshBootstrap();
  }, [editor, refreshBootstrap]);

  const importMedia = useCallback(async () => {
    const importedAssets = (await edifyApi.importMedia()) as MediaAsset[];
    const assets = await Promise.all(importedAssets.map(enrichImportedAsset));
    if (assets.length > 0) {
      editor.addAssets(assets);
      setScreen('editor');
      pushToast({ title: 'Media imported', detail: `${assets.length} file${assets.length > 1 ? 's' : ''} added`, tone: 'success' });
    }
  }, [editor, pushToast]);

  const inspectDroppedFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const paths = fileArray
      .map((file) => (file as File & { path?: string }).path || edifyApi.getPathForFile?.(file) || '')
      .filter(Boolean) as string[];
    if (paths.length === 0) {
      const browserAssets = await Promise.all(fileArray.map(browserAssetFromFile).map(enrichImportedAsset));
      if (browserAssets.length > 0) {
        editor.addAssets(browserAssets);
        setScreen('editor');
        pushToast({ title: 'Drop accepted', detail: `${browserAssets.length} browser asset${browserAssets.length > 1 ? 's' : ''} ready`, tone: 'success' });
        return;
      }
      pushToast({ title: 'Drop blocked', detail: 'Edify could not read those files. Use Import as a fallback.', tone: 'warning' });
      return;
    }
    const inspectedAssets = (await edifyApi.inspectDroppedFiles(paths)) as MediaAsset[];
    const assets = await Promise.all(inspectedAssets.map(enrichImportedAsset));
    editor.addAssets(assets);
    setScreen('editor');
    pushToast({ title: 'Drop accepted', detail: `${assets.length} asset${assets.length > 1 ? 's' : ''} ready`, tone: 'success' });
  }, [editor, pushToast]);

  const createNewProject = useCallback((name = 'Untitled Edit') => {
    editor.setProject(createDemoProject(name), 'dirty');
    setScreen('editor');
  }, [editor]);

  const openPremiumStudio = useCallback(() => {
    editor.setActivePanel('premium');
    setScreen('editor');
    pushToast({ title: 'Premium Studio', detail: 'Choose a plan or open the hidden code field below the plans.', tone: 'info' });
  }, [editor, pushToast]);

  const openExportFlow = useCallback(() => {
    if (isBrowserMode) {
      openDesktopFeature(
        'Advanced export',
        'High quality export, render cache, advanced codecs, premium output presets, and the full desktop export pipeline are available in the Windows application.'
      );
      return;
    }
    setShowExport(true);
  }, [isBrowserMode, openDesktopFeature]);

  const openPanel = useCallback((panel: PanelId) => {
    editor.setActivePanel(panel);
    setScreen('editor');
  }, [editor]);

  const commandActions = useMemo<CommandAction[]>(() => [
    { id: 'new', label: 'New Project', detail: 'Create a fresh Edify project', shortcut: 'Ctrl+N', run: () => createNewProject('Untitled Edit') },
    { id: 'import', label: 'Import Media', detail: 'Add videos, images, or audio from Windows', shortcut: 'Ctrl+I', run: importMedia },
    { id: 'save', label: 'Save Project', detail: 'Write the current project locally', shortcut: 'Ctrl+S', run: () => void saveProject(false) },
    { id: 'export', label: 'Export Video', detail: 'Open render settings, quality, and output file name', shortcut: 'Ctrl+E', run: openExportFlow },
    { id: 'quick', label: 'Quick Edit Mode', detail: 'One-click cinematic, gaming, montage, and creator recipes', run: () => openPanel('quick') },
    { id: 'ai', label: 'AI Lab', detail: 'Auto subtitles, beat helper, voice enhance, and blur tools', run: () => openPanel('ai') },
    { id: 'sounds', label: 'Sound Library', detail: 'Place impacts, risers, whooshes, and ambience', run: () => openPanel('sounds') },
    { id: 'marketplace', label: 'Marketplace', detail: 'Browse free and premium creative packs', run: () => openPanel('marketplace') },
    { id: 'premium', label: 'Premium Studio', detail: 'Plans, code field, premium packs, and ultra exports', run: openPremiumStudio },
    { id: 'shortcuts', label: 'Shortcuts', detail: 'Show the keyboard cheat sheet', shortcut: '?', run: () => setShowShortcuts(true) },
    { id: 'settings', label: 'Settings', detail: 'Open performance and app preferences', run: () => setShowSettings(true) }
  ], [createNewProject, importMedia, openExportFlow, openPanel, openPremiumStudio, saveProject]);

  const renameRecentProject = useCallback(async (project: ProjectSummary) => {
    const nextName = window.prompt('Rename project', project.name)?.trim();
    if (!nextName) return;
    const result = await edifyApi.renameProject(project.path, nextName);
    if (result.recentProjects) {
      setRecentProjects(result.recentProjects as ProjectSummary[]);
    }
    if (editor.project.path === project.path && result.document) {
      editor.setProject(result.document as ProjectDocument, editor.saveStatus);
    }
    pushToast({ title: 'Project renamed', detail: nextName, tone: 'success' });
  }, [editor, pushToast]);

  const deleteRecentProject = useCallback(async (project: ProjectSummary) => {
    const confirmed = window.confirm(`Delete "${project.name}" from disk and recent projects?`);
    if (!confirmed) return;
    const result = await edifyApi.deleteProject(project.path);
    if (result.recentProjects) {
      setRecentProjects(result.recentProjects as ProjectSummary[]);
    }
    pushToast({ title: 'Project deleted', detail: project.name, tone: 'success' });
  }, [pushToast]);

  const restoreRecovery = useCallback(async () => {
    setShowRecovery(false);
    try {
      const document = (await edifyApi.readAutosave()) as ProjectDocument | null;
      if (document) {
        editor.setProject(document, 'autosaved');
        setScreen('editor');
        await edifyApi.clearAutosave();
        await refreshBootstrap();
        pushToast({ title: 'Recovery project restored', detail: document.name, tone: 'success' });
        return;
      }
      await edifyApi.clearAutosave();
      await refreshBootstrap();
      pushToast({ title: 'No recovery file', detail: 'The recovery file was already cleared.', tone: 'info' });
    } catch (error) {
      await edifyApi.clearAutosave().catch(() => undefined);
      await refreshBootstrap().catch(() => undefined);
      pushToast({ title: 'Recovery failed', detail: error instanceof Error ? error.message : 'Edify could not restore this autosave.', tone: 'warning' });
    }
  }, [editor, pushToast, refreshBootstrap]);

  const discardRecovery = useCallback(async () => {
    setShowRecovery(false);
    try {
      await edifyApi.clearAutosave();
      await refreshBootstrap();
      pushToast({ title: 'Recovery discarded', detail: 'The old autosave was cleared.', tone: 'success' });
    } catch (error) {
      pushToast({ title: 'Could not clear recovery', detail: error instanceof Error ? error.message : 'The recovery file could not be removed.', tone: 'warning' });
    }
  }, [pushToast, refreshBootstrap]);

  const skipRecovery = useCallback(() => {
    setShowRecovery(false);
    pushToast({ title: 'Recovery hidden', detail: 'You can keep editing from the current screen.', tone: 'info' });
  }, [pushToast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (event.ctrlKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        void importMedia();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        openExportFlow();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createNewProject('Untitled Edit');
      }
      if (event.code === 'Space') {
        event.preventDefault();
        editor.togglePlayback();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveProject(event.shiftKey);
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'z') editor.undo();
      if (event.ctrlKey && event.key.toLowerCase() === 'y') editor.redo();
      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        editor.duplicateSelectedClip();
      }
      if (event.key === 'Delete') editor.deleteSelectedClip();
      if (event.key.toLowerCase() === 's' && !event.ctrlKey) editor.splitSelectedClip();
      if (event.key === '+' || event.key === '=') editor.setTimelineZoom(editor.timelineZoom + 8);
      if (event.key === '-') editor.setTimelineZoom(editor.timelineZoom - 8);
      if (event.key === 'ArrowRight') editor.setPlayhead(editor.playhead + 1 / editor.project.settings.fps);
      if (event.key === 'ArrowLeft') editor.setPlayhead(editor.playhead - 1 / editor.project.settings.fps);
      if (event.key === '?') setShowShortcuts(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createNewProject, editor, importMedia, openExportFlow, saveProject]);

  const handleAuthenticated = useCallback((user: AppwriteUser) => {
    setAuthUser(user);
    setShowAuthModal(false);
    pushToast({
      title: 'Account connected',
      detail: user.email ?? user.name ?? 'Your Edify account is active in this browser.',
      tone: 'success'
    });
  }, [pushToast]);

  const handleSignedOut = useCallback(() => {
    setAuthUser(null);
    pushToast({
      title: 'Signed out',
      detail: 'Your browser session was disconnected.',
      tone: 'info'
    });
  }, [pushToast]);

  return (
    <>
      {screen === 'landing' ? (
        <WebLanding
          onOpenEditor={() => setScreen('editor')}
        />
      ) : (
        <EditorShell
          editor={editor}
          bootstrap={bootstrap}
          isBrowserMode={isBrowserMode}
          authUserName={authUser?.name || authUser?.email || null}
          onOpenAccount={() => setShowAuthModal(true)}
          onDesktopFeature={openDesktopFeature}
          onBackHome={() => {
            window.location.href = './index.html';
          }}
          onImportMedia={importMedia}
          onSave={() => void saveProject(false)}
          onSaveAs={() => void saveProject(true)}
          onExport={openExportFlow}
          onShortcuts={() => setShowShortcuts(true)}
          onSettings={() => setShowSettings(true)}
          onDropFiles={inspectDroppedFiles}
          pushToast={pushToast}
        />
      )}

      {showAuthModal && (
        <div className="modal-scrim">
          <AuthGate
            user={authUser}
            variant="modal"
            onAuthenticated={handleAuthenticated}
            onSignedOut={handleSignedOut}
            onClose={() => setShowAuthModal(false)}
          />
        </div>
      )}

      {showExport && (
        <ExportModal
          project={editor.project}
          onClose={() => setShowExport(false)}
          pushToast={pushToast}
        />
      )}

      {desktopFeature && (
        <DesktopFeatureModal
          title={desktopFeature.title}
          detail={desktopFeature.detail}
          onClose={() => setDesktopFeature(null)}
        />
      )}

      {showShortcuts && <ShortcutModal onClose={() => setShowShortcuts(false)} />}

      {showCommandPalette && (
        <CommandPalette
          actions={commandActions}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {showSettings && bootstrap && (
        <SettingsModal
          settings={bootstrap.settings}
          onClose={() => setShowSettings(false)}
          onSettingsChange={(settings) => setBootstrap((current) => current ? { ...current, settings } : current)}
          pushToast={pushToast}
        />
      )}

      {showRecovery && (
        <div className="modal-scrim">
          <div className="dialog recovery-dialog">
            <div className="dialog-icon">
              <AlertTriangle size={20} />
            </div>
            <h2>Recovery project found</h2>
            <p>Edify found a local autosave from the last session. Restore it or clear the recovery file.</p>
            <div className="dialog-actions">
              <button className="ghost-button" type="button" onClick={skipRecovery}>Later</button>
              <button className="ghost-button" type="button" onClick={discardRecovery}>Discard</button>
              <button className="primary-button" type="button" onClick={restoreRecovery}>Restore project</button>
            </div>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} />
    </>
  );
}
