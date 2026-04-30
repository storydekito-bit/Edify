import {
  FilePlus2,
  FileUp,
  FolderOpen,
  Grid2x2,
  ImagePlus,
  LayoutTemplate,
  Save,
  Sparkles,
  Wand2
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ToastStack } from '../ToastStack';
import { AccountModal } from '../modals/AccountModal';
import { CommandPalette, type CommandAction } from '../modals/CommandPalette';
import { PremiumOfferModal } from '../modals/PremiumOfferModal';
import { StudioCanvasArea } from './StudioCanvasArea';
import { StudioExportModal } from './StudioExportModal';
import { StudioLayersPanel } from './StudioLayersPanel';
import { StudioPremiumModal } from './StudioPremiumModal';
import { StudioPropertiesPanel } from './StudioPropertiesPanel';
import { StudioShareModal } from './StudioShareModal';
import { StudioShortcutsModal } from './StudioShortcutsModal';
import { StudioStatusbar } from './StudioStatusbar';
import { StudioToolbar } from './StudioToolbar';
import { StudioTopbar } from './StudioTopbar';
import { StudioTutorialModal } from './StudioTutorialModal';
import { edifyApi } from '../../lib/bridge';
import { createId } from '../../lib/id';
import { hasAnyPremium, hasThumbnailStudioAccess, loadPremiumAccess, type PremiumAccess } from '../../lib/premium';
import { buildPdfFromStudioProject, rasterizeStudioSvg, renderStudioProjectSvg } from '../../lib/studioExport';
import { useStudioState } from '../../state/useStudioState';
import type { DesktopAccountProvider, DesktopAccountUser, ProjectSummary, Toast } from '../../types/edify';
import type { StudioPremiumFeature, StudioProject, StudioToolId } from '../../types/studio';

type StudioBootstrap = {
  recentProjects: Array<{ id: string; name: string; path: string; updatedAt: string; thumbnail?: string }>;
  accountUser?: DesktopAccountUser | null;
};

type StudioConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
};

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function EdifyStudioWindow() {
  const [bootstrap, setBootstrap] = useState<StudioBootstrap>({ recentProjects: [], accountUser: null });
  const [showExport, setShowExport] = useState(false);
  const [showPremium, setShowPremium] = useState<{ feature: StudioPremiumFeature; title: string } | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [accountBusyProvider, setAccountBusyProvider] = useState<DesktopAccountProvider | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | undefined>(undefined);
  const [confirmState, setConfirmState] = useState<StudioConfirmState | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [shareBusyAction, setShareBusyAction] = useState<'copy-summary' | 'copy-review' | 'preview' | 'pdf' | 'bundle' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess>(() => loadPremiumAccess());
  const studio = useStudioState();
  const premiumEnabled = hasAnyPremium(premiumAccess) || hasThumbnailStudioAccess(premiumAccess);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = createId('toast');
    setToasts((current) => [...current, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const requestConfirmation = useCallback((next: StudioConfirmState) => {
    setConfirmState(next);
  }, []);

  const copyTextToClipboard = useCallback(
    async (text: string, title: string, detail: string) => {
      if (!navigator.clipboard?.writeText) {
        pushToast({
          title: 'Clipboard unavailable',
          detail: 'This device cannot copy text from Thumbnail Studio right now.',
          tone: 'warning'
        });
        return;
      }
      await navigator.clipboard.writeText(text);
      pushToast({ title, detail, tone: 'success' });
    },
    [pushToast]
  );

  const saveProject = useCallback(async () => {
    const result = await edifyApi.saveStudioProject?.(studio.project);
    if (result?.document) {
      studio.loadProject(result.document);
      pushToast({ title: 'Project saved', detail: result.filePath || studio.project.name, tone: 'success' });
    }
  }, [pushToast, studio]);

  const saveProjectAs = useCallback(async () => {
    const result = await edifyApi.saveStudioProjectAs?.(studio.project);
    if (result?.document) {
      studio.loadProject(result.document);
      pushToast({ title: 'Project saved as', detail: result.filePath || studio.project.name, tone: 'success' });
    }
  }, [pushToast, studio]);

  const openProject = useCallback(async () => {
    const result = await edifyApi.openStudioProjectDialog?.();
    if (!result?.canceled && result.document) {
      studio.loadProject(result.document);
      pushToast({ title: 'Project opened', detail: result.document.name, tone: 'success' });
    }
  }, [pushToast, studio]);

  const importImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml';
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      files.forEach((file, index) => {
        const src = URL.createObjectURL(file);
        studio.addImageLayer({ name: file.name, src, x: 140 + index * 28, y: 100 + index * 24 });
      });
      if (files.length) {
        pushToast({ title: 'Images imported', detail: `${files.length} asset(s) added to the canvas.`, tone: 'success' });
      }
    };
    input.click();
  }, [pushToast, studio]);

  const refreshDesktopAccount = useCallback(async () => {
    try {
      const user = await edifyApi.getDesktopAccount?.();
      setBootstrap((current) => ({ ...current, accountUser: user ?? null }));
      setAccountMessage(undefined);
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : 'Could not refresh the desktop account.');
    }
  }, [pushToast]);

  const handleProviderSelect = useCallback(async (provider: DesktopAccountProvider) => {
    setAccountBusyProvider(provider);
    setAccountMessage(undefined);
    try {
      const user = await edifyApi.startDesktopOAuth(provider);
      setBootstrap((current) => ({ ...current, accountUser: user }));
      pushToast({
        title: 'Account connected',
        detail: user?.email || 'Your Edify desktop account is now active.',
        tone: 'success'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in not completed.';
      setAccountMessage(message);
      pushToast({
        title: 'Sign-in failed',
        detail: message,
        tone: 'warning'
      });
    } finally {
      setAccountBusyProvider(null);
    }
  }, []);

  const handleStudioSignOut = useCallback(async () => {
    try {
      await edifyApi.signOutDesktopAccount?.();
      setBootstrap((current) => ({ ...current, accountUser: null }));
      setAccountMessage(undefined);
      pushToast({
        title: 'Account signed out',
        detail: 'Your desktop account session was removed.',
        tone: 'success'
      });
    } catch (error) {
      pushToast({
        title: 'Sign-out failed',
        detail: error instanceof Error ? error.message : 'Could not sign out the desktop account.',
        tone: 'warning'
      });
    }
  }, []);

  useEffect(() => {
    void edifyApi.getStudioBootstrap?.().then((info: StudioBootstrap) => {
      if (!info) return;
      setBootstrap(info);
    }).catch(() => undefined);
    void refreshDesktopAccount();
    if (localStorage.getItem('edify-studio-tutorial-seen') !== 'true') {
      setShowTutorial(true);
    }
    void edifyApi.getEdifyStudioSeedProject?.().then((seed: StudioProject | null) => {
      if (seed?.kind === 'studio') {
        studio.loadProject(seed);
      }
    }).catch(() => undefined);
  }, [refreshDesktopAccount]);

  useEffect(() => {
    const refreshPremium = () => setPremiumAccess(loadPremiumAccess());
    window.addEventListener('focus', refreshPremium);
    window.addEventListener('storage', refreshPremium);
    return () => {
      window.removeEventListener('focus', refreshPremium);
      window.removeEventListener('storage', refreshPremium);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem('edify-studio-autosave', JSON.stringify(studio.project));
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [studio.project]);

  const topQuickActions = useMemo(() => [
    { label: 'New Studio', icon: FilePlus2, run: () => studio.createNewProject('Untitled Studio'), detail: 'Create a fresh thumbnail project.' },
    { label: 'Open Studio', icon: FolderOpen, run: () => void openProject(), detail: 'Open a saved .edify studio project.' },
    { label: 'Save As', icon: Save, run: () => void saveProjectAs(), detail: 'Save a copy of the current studio project.' },
    { label: 'Import image', icon: ImagePlus, run: () => void importImage(), detail: 'Bring PNG, JPG, WEBP, or SVG onto the canvas.' },
    { label: 'Add text', icon: LayoutTemplate, run: () => studio.addTextLayer('NEW TITLE'), detail: 'Create an editable text layer.' },
    { label: 'Add shape', icon: Grid2x2, run: () => studio.addShapeLayer('rounded-rectangle'), detail: 'Create a shape layer.' },
    { label: 'AI result', icon: Wand2, run: () => studio.runAiAction({ action: 'subject-select', prompt: 'Create a clean subject-separated layer for the current thumbnail.' }), detail: 'Generate a new AI layer result.' },
    { label: 'Template preset', icon: Sparkles, run: () => studio.setProjectPreset('youtube-thumb'), detail: 'Switch to the YouTube thumbnail preset.' }
  ], [studio]);

  const filteredQuickActions = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return topQuickActions;
    return topQuickActions.filter((action) => `${action.label} ${action.detail}`.toLowerCase().includes(normalized));
  }, [searchQuery, topQuickActions]);

  const shareSummary = useMemo(() => {
    const visibleLayers = studio.project.layers.filter((layer) => layer.visible).length;
    const selected = studio.selection.ids.length;
    return [
      `Project: ${studio.project.name}`,
      `Canvas: ${studio.project.canvas.width} x ${studio.project.canvas.height}`,
      `Theme: ${studio.project.theme}`,
      `Visible layers: ${visibleLayers}/${studio.project.layers.length}`,
      `Selected layers: ${selected}`,
      `Updated: ${new Date(studio.project.updatedAt).toLocaleString('en-GB')}`,
      `Account: ${bootstrap.accountUser?.email || 'Local only'}`
    ].join('\n');
  }, [bootstrap.accountUser?.email, studio.project, studio.selection.ids.length]);

  const reviewBrief = useMemo(() => {
    return [
      'Thumbnail review handoff',
      '',
      `Project: ${studio.project.name}`,
      `Primary format: ${studio.project.canvas.width} x ${studio.project.canvas.height}`,
      'Suggested review points: title readability, subject framing, contrast, mobile visibility, and CTA strength.',
      `Theme: ${studio.project.theme}`,
      `Visible layers: ${studio.project.layers.filter((layer) => layer.visible).length}`,
      `Last updated: ${new Date(studio.project.updatedAt).toLocaleString('en-GB')}`,
      'Prepared from Thumbnail Studio inside Edify.'
    ].join('\n');
  }, [studio.project]);

  const handleSharePreviewExport = useCallback(async () => {
    setShareBusyAction('preview');
    try {
      const svg = renderStudioProjectSvg(studio.project, { hideSelection: true });
      const buffer = await rasterizeStudioSvg(
        svg,
        studio.project.canvas.width,
        studio.project.canvas.height,
        'image/png',
        0.96
      );
      const result = await edifyApi.saveStudioBinary({
        suggestedName: `${studio.project.name} Share Preview`,
        extension: 'png',
        mimeType: 'image/png',
        buffer
      });
      if (!result?.canceled) {
        pushToast({
          title: 'Share preview exported',
          detail: result.filePath || 'PNG review preview saved.',
          tone: 'success'
        });
      }
    } catch (error) {
      pushToast({
        title: 'Share preview failed',
        detail: error instanceof Error ? error.message : 'PNG preview export could not finish.',
        tone: 'warning'
      });
    } finally {
      setShareBusyAction(null);
    }
  }, [pushToast, studio.project]);

  const handleSharePdfExport = useCallback(async () => {
    setShareBusyAction('pdf');
    try {
      const svg = renderStudioProjectSvg(studio.project, { hideSelection: true });
      const buffer = await buildPdfFromStudioProject(svg, studio.project.canvas.width, studio.project.canvas.height);
      const result = await edifyApi.saveStudioBinary({
        suggestedName: `${studio.project.name} Review Sheet`,
        extension: 'pdf',
        mimeType: 'application/pdf',
        buffer
      });
      if (!result?.canceled) {
        pushToast({
          title: 'Review PDF exported',
          detail: result.filePath || 'PDF review sheet saved.',
          tone: 'success'
        });
      }
    } catch (error) {
      pushToast({
        title: 'Review PDF failed',
        detail: error instanceof Error ? error.message : 'PDF export could not finish.',
        tone: 'warning'
      });
    } finally {
      setShareBusyAction(null);
    }
  }, [pushToast, studio.project]);

  const handleShareBundleSave = useCallback(async () => {
    setShareBusyAction('bundle');
    try {
      const bundle = {
        kind: 'edify-share-package',
        version: 1,
        exportedAt: new Date().toISOString(),
        summary: shareSummary,
        reviewBrief,
        account: bootstrap.accountUser
          ? {
              email: bootstrap.accountUser.email,
              provider: bootstrap.accountUser.provider
            }
          : null,
        project: studio.project
      };
      const buffer = new TextEncoder().encode(JSON.stringify(bundle, null, 2)).buffer;
      const result = await edifyApi.saveStudioBinary({
        suggestedName: `${studio.project.name} Share Bundle.edify-share`,
        extension: 'json',
        mimeType: 'application/json',
        buffer
      });
      if (!result?.canceled) {
        pushToast({
          title: 'Share bundle saved',
          detail: result.filePath || 'Portable share package saved.',
          tone: 'success'
        });
      }
    } catch (error) {
      pushToast({
        title: 'Share bundle failed',
        detail: error instanceof Error ? error.message : 'Share package could not be saved.',
        tone: 'warning'
      });
    } finally {
      setShareBusyAction(null);
    }
  }, [bootstrap.accountUser, pushToast, reviewBrief, shareSummary, studio.project]);

  const commandActions = useMemo<CommandAction[]>(() => [
    { id: 'new-project', label: 'New project', detail: 'Create a fresh studio canvas.', shortcut: 'Ctrl+N', run: () => studio.createNewProject('Untitled Studio') },
    { id: 'open-project', label: 'Open project', detail: 'Open a saved studio project.', shortcut: 'Ctrl+O', run: () => void openProject() },
    { id: 'save-project', label: 'Save project', detail: 'Save the current project.', shortcut: 'Ctrl+S', run: () => void saveProject() },
    { id: 'save-project-as', label: 'Save as', detail: 'Save the current project under a new name.', shortcut: 'Ctrl+Shift+S', run: () => void saveProjectAs() },
    { id: 'export-project', label: 'Export', detail: 'Export PNG, JPG, WEBP, SVG, or PDF.', shortcut: 'Ctrl+E', run: () => setShowExport(true) },
    { id: 'import-image', label: 'Import image', detail: 'Import image layers onto the canvas.', shortcut: 'Ctrl+O', run: () => void importImage() },
    { id: 'add-text', label: 'Add text', detail: 'Create a new text layer.', shortcut: 'T', run: () => studio.addTextLayer('NEW TITLE') },
    { id: 'add-shape', label: 'Add shape', detail: 'Create a new rectangle layer.', shortcut: 'U', run: () => studio.addShapeLayer('rounded-rectangle') },
    { id: 'add-gradient', label: 'Add gradient layer', detail: 'Create a full gradient overlay image layer.', shortcut: 'G', run: () => studio.addGradientLayer() },
    { id: 'adjustment-layer', label: 'Add adjustment layer', detail: 'Create a non-destructive adjustment overlay.', run: () => studio.addAdjustmentLayer() },
    { id: 'group-selection', label: 'Group selection', detail: 'Group the selected layers.', shortcut: 'Ctrl+G', run: () => studio.groupSelection() },
    { id: 'ungroup-selection', label: 'Ungroup selection', detail: 'Ungroup the current layer group.', shortcut: 'Ctrl+Shift+G', run: () => studio.ungroupSelection() },
    { id: 'merge-selection', label: 'Merge selected', detail: 'Merge the selected visible layers into one smart layer.', run: () => studio.mergeSelectedLayers() },
    {
      id: 'flatten',
      label: 'Flatten image',
      detail: 'Merge the full visible composition into one layer.',
      run: () => requestConfirmation({
        title: 'Flatten image',
        message: 'This will merge the visible composition into a single layer in Thumbnail Studio.',
        confirmLabel: 'Flatten',
        onConfirm: () => studio.flattenImage()
      })
    },
    { id: 'toggle-grid', label: 'Toggle grid', detail: 'Show or hide the canvas grid.', shortcut: "Ctrl+'", run: () => studio.toggleCanvasGrid() },
    { id: 'toggle-guides', label: 'Toggle guides', detail: 'Show or hide guides.', shortcut: 'Ctrl+;', run: () => studio.toggleCanvasGuides() },
    { id: 'toggle-rulers', label: 'Toggle rulers', detail: 'Show or hide rulers.', shortcut: 'Ctrl+R', run: () => studio.toggleCanvasRulers() },
    { id: 'toggle-snap', label: 'Toggle snap', detail: 'Turn snapping on or off.', run: () => studio.toggleCanvasSnap() },
    { id: 'fit-screen', label: 'Fit to screen', detail: 'Center and fit the canvas.', shortcut: 'Ctrl+0', run: () => studio.fitCanvasToScreen() },
    { id: 'zoom-100', label: '100% zoom', detail: 'Set the canvas to 100%.', shortcut: 'Ctrl+1', run: () => studio.setCanvasTo100() },
    { id: 'rotate-canvas', label: 'Rotate canvas +15°', detail: 'Rotate the artboard view.', shortcut: 'R', run: () => studio.rotateCanvas(15) },
    { id: 'ai-fill', label: 'Generative fill', detail: 'Generate a new AI layer from a prompt.', run: () => studio.runAiAction({ action: 'generative-fill', prompt: 'Add a premium creator hook layer.' }) },
    { id: 'ai-remove', label: 'Background remover', detail: 'Create a cleaned cutout result layer.', run: () => studio.runAiAction({ action: 'background-remover', prompt: 'Remove the background and isolate the subject.' }) },
    { id: 'shortcuts', label: 'Shortcut help', detail: 'Open the full studio shortcut sheet.', shortcut: 'Ctrl+K', run: () => setShowShortcuts(true) }
  ], [requestConfirmation, studio]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setShowCommands(true);
        }
        return;
      }

      const ctrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (ctrl && key === 'k') {
        event.preventDefault();
        setShowCommands(true);
        return;
      }
      if (ctrl && key === 'n') {
        event.preventDefault();
        studio.createNewProject('Untitled Studio');
        return;
      }
      if (ctrl && key === 'o') {
        event.preventDefault();
        void openProject();
        return;
      }
      if (ctrl && key === 's' && event.shiftKey) {
        event.preventDefault();
        void saveProjectAs();
        return;
      }
      if (ctrl && key === 's') {
        event.preventDefault();
        void saveProject();
        return;
      }
      if (ctrl && key === 'e') {
        event.preventDefault();
        setShowExport(true);
        return;
      }
      if (ctrl && key === 'p') {
        event.preventDefault();
        setShowExport(true);
        return;
      }
      if (ctrl && key === 'w') {
        event.preventDefault();
        studio.createNewProject('Untitled Studio');
        return;
      }
      if (ctrl && key === 'z' && event.shiftKey) {
        event.preventDefault();
        studio.redo();
        return;
      }
      if (ctrl && key === 'z') {
        event.preventDefault();
        studio.undo();
        return;
      }
      if (ctrl && key === 'y') {
        event.preventDefault();
        studio.redo();
        return;
      }
      if (ctrl && key === 'c') {
        event.preventDefault();
        studio.copySelection();
        pushToast({ title: 'Selection copied', detail: 'Layer selection copied inside Thumbnail Studio.', tone: 'info' });
        return;
      }
      if (ctrl && key === 'v') {
        event.preventDefault();
        studio.pasteClipboard();
        return;
      }
      if (ctrl && key === 'x') {
        event.preventDefault();
        studio.cutSelection();
        return;
      }
      if (event.key === 'Delete') {
        event.preventDefault();
        if (studio.selection.ids.length) {
          requestConfirmation({
            title: 'Delete selected layers',
            message: `Delete ${studio.selection.ids.length} selected layer${studio.selection.ids.length > 1 ? 's' : ''} from this thumbnail project?`,
            confirmLabel: 'Delete',
            tone: 'danger',
            onConfirm: () => studio.deleteSelection()
          });
        }
        return;
      }
      if (ctrl && key === 'a') {
        event.preventDefault();
        studio.selectAllLayers();
        return;
      }
      if (ctrl && key === 'd') {
        event.preventDefault();
        studio.deselect();
        return;
      }
      if (ctrl && key === 'j') {
        event.preventDefault();
        studio.duplicateSelection();
        return;
      }
      if (ctrl && key === 'g' && event.shiftKey) {
        event.preventDefault();
        studio.ungroupSelection();
        return;
      }
      if (ctrl && key === 'g') {
        event.preventDefault();
        studio.groupSelection();
        return;
      }
      if (ctrl && key === 'i') {
        event.preventDefault();
        if (studio.primaryLayer) studio.invertLayerMask(studio.primaryLayer.id);
        return;
      }
      if (ctrl && event.altKey && key === 'g') {
        event.preventDefault();
        if (studio.primaryLayer) studio.toggleClippingMask(studio.primaryLayer.id);
        return;
      }
      if (ctrl && key === '0') {
        event.preventDefault();
        studio.fitCanvasToScreen();
        return;
      }
      if (ctrl && key === '1') {
        event.preventDefault();
        studio.setCanvasTo100();
        return;
      }
      if (ctrl && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        studio.setCanvasZoom(studio.project.canvas.zoom + 0.1);
        return;
      }
      if (ctrl && event.key === '-') {
        event.preventDefault();
        studio.setCanvasZoom(studio.project.canvas.zoom - 0.1);
        return;
      }
      if (ctrl && event.key === ';') {
        event.preventDefault();
        studio.toggleCanvasGuides();
        return;
      }
      if (ctrl && event.key === "'") {
        event.preventDefault();
        studio.toggleCanvasGrid();
        return;
      }
      if (ctrl && key === 'r') {
        event.preventDefault();
        studio.toggleCanvasRulers();
        return;
      }
      if (key === 'f') {
        event.preventDefault();
        studio.setBeforeAfter(!studio.beforeAfter);
        return;
      }
      if (event.altKey && event.key === ']') {
        event.preventDefault();
        studio.selectRelativeLayer(1);
        return;
      }
      if (event.altKey && event.key === '[') {
        event.preventDefault();
        studio.selectRelativeLayer(-1);
        return;
      }
      if (ctrl && event.shiftKey && event.key === ']') {
        event.preventDefault();
        studio.moveSelectionStack('front');
        return;
      }
      if (ctrl && event.shiftKey && event.key === '[') {
        event.preventDefault();
        studio.moveSelectionStack('back');
        return;
      }
      if (ctrl && event.key === ']') {
        event.preventDefault();
        studio.moveSelectionStack('up');
        return;
      }
      if (ctrl && event.key === '[') {
        event.preventDefault();
        studio.moveSelectionStack('down');
        return;
      }

      const toolMap: Record<string, StudioToolId> = {
        v: 'move',
        m: 'marquee',
        l: 'lasso',
        w: 'magic-wand',
        c: 'crop',
        b: 'brush',
        e: 'eraser',
        g: event.shiftKey ? 'gradient' : 'fill',
        i: 'eyedropper',
        t: 'text',
        u: 'rectangle',
        p: 'pen',
        s: 'clone',
        h: 'hand',
        z: 'zoom'
      };
      if (toolMap[key]) {
        event.preventDefault();
        studio.setActiveTool(toolMap[key]);
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        studio.rotateCanvas(15);
        return;
      }
      if (event.key === '[') {
        event.preventDefault();
        if (event.shiftKey) {
          studio.setBrushSettings({ ...studio.brushSettings, hardness: Math.max(0, studio.brushSettings.hardness - 5) });
        } else {
          studio.setBrushSettings({ ...studio.brushSettings, size: Math.max(4, studio.brushSettings.size - 4) });
        }
        return;
      }
      if (event.key === ']') {
        event.preventDefault();
        if (event.shiftKey) {
          studio.setBrushSettings({ ...studio.brushSettings, hardness: Math.min(100, studio.brushSettings.hardness + 5) });
        } else {
          studio.setBrushSettings({ ...studio.brushSettings, size: Math.min(220, studio.brushSettings.size + 4) });
        }
        return;
      }
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        const opacity = event.key === '0' ? 1 : Number(event.key) / 10;
        studio.setBrushSettings({ ...studio.brushSettings, opacity });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openProject, requestConfirmation, saveProject, saveProjectAs, studio]);

  return (
    <div className={`studio-shell theme-${studio.theme}`}>
      <StudioTopbar
        projectName={studio.project.name}
        zoomPercent={Math.round(studio.project.canvas.zoom * 100)}
        theme={studio.theme}
        searchValue={searchQuery}
        accountUser={bootstrap.accountUser}
        canUndo={studio.history.length > 0}
        canRedo={studio.future.length > 0}
        onUndo={studio.undo}
        onRedo={studio.redo}
        onSave={() => void saveProject()}
        onExport={() => setShowExport(true)}
        onShare={() => setShowShare(true)}
        onToggleTheme={studio.toggleTheme}
        onOpenAccount={() => setShowAccount(true)}
        onSearchChange={setSearchQuery}
        onOpenCommands={() => setShowCommands(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />

      <div className="studio-quickbar">
        {filteredQuickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} type="button" className="secondary-button" onClick={action.run}>
              <Icon size={15} /> {action.label}
            </button>
          );
        })}
        <button className="secondary-button" type="button" onClick={() => studio.setBeforeAfter(!studio.beforeAfter)}>
          <FileUp size={15} /> {studio.beforeAfter ? 'Show full edit' : 'Before / After'}
        </button>
        <button className="secondary-button" type="button" onClick={() => setShowPremium({ feature: 'advanced-workspace', title: 'Thumbnail Studio Pro' })}>
          <Sparkles size={15} /> Premium
        </button>
      </div>

      <div className="studio-workspace">
        <StudioToolbar
          activeTool={studio.activeTool}
          premiumEnabled={premiumEnabled}
          onToolSelect={studio.setActiveTool}
          onRequestPremium={(feature, title) => setShowPremium({ feature, title })}
        />

        <StudioCanvasArea
          project={studio.project}
          theme={studio.theme}
          layers={studio.project.layers}
          selectionIds={studio.selection.ids}
          primaryLayer={studio.primaryLayer}
          activeTool={studio.activeTool}
          premiumEnabled={premiumEnabled}
          guides={studio.guides}
          beforeAfter={studio.beforeAfter}
          onSelectLayer={studio.selectLayer}
          onSelectMany={studio.selectMany}
          onClearSelection={studio.clearSelection}
          onMoveSelectionBy={studio.moveSelectionBy}
          onResizePrimary={studio.resizePrimaryLayer}
          onRotatePrimary={studio.rotatePrimaryLayer}
          onSetCanvasZoom={studio.setCanvasZoom}
          onSetCanvasPan={studio.setCanvasPan}
          onSetGuides={studio.setGuides}
          onCropRect={studio.cropCanvasToRect}
          onAddTextAt={(x, y) => studio.addTextLayer('NEW TITLE', { x, y })}
          onAddShapeAt={(shape, x, y) => studio.addShapeLayer(shape, { x, y })}
          onApplyToolAt={studio.applyToolAt}
          onRequestPremiumTool={(tool) => setShowPremium({ feature: 'advanced-layers', title: `${tool} is a Pro tool` })}
          onCursorMove={setCursor}
        />

        <div className="studio-right-rail">
          <StudioPropertiesPanel
            layer={studio.primaryLayer}
            premiumEnabled={premiumEnabled}
            canvas={studio.project.canvas}
            activeColor={studio.activeColor}
            brushSettings={studio.brushSettings}
            onUpdateLayer={studio.updateLayer}
            onRunAi={(action, prompt) => studio.runAiAction({ action, prompt })}
            onRequestPremium={(feature, title) => setShowPremium({ feature, title })}
            onAlign={studio.alignSelection}
            onDistribute={studio.distributeSelection}
            onAddAdjustmentLayer={studio.addAdjustmentLayer}
            onToggleMask={studio.toggleLayerMask}
            onApplyMask={studio.applyLayerMask}
            onInvertMask={studio.invertLayerMask}
            onToggleClipping={studio.toggleClippingMask}
            onConvertSmartObject={studio.convertSelectionToSmartObject}
            onAutoEnhance={studio.autoEnhancePrimary}
            onAutoColor={studio.autoColorPrimary}
            onAutoContrast={studio.autoContrastPrimary}
            onApplyTextPreset={studio.applyTextPreset}
            onSetPrimaryColor={studio.setPrimaryLayerColor}
            onSetActiveColor={studio.setActiveColor}
            onSetBrushSettings={studio.setBrushSettings}
            onToggleGrid={studio.toggleCanvasGrid}
            onToggleGuides={studio.toggleCanvasGuides}
            onToggleRulers={studio.toggleCanvasRulers}
            onToggleSnap={studio.toggleCanvasSnap}
            onToggleTransparent={studio.toggleCanvasTransparent}
            onSetCanvasBackground={studio.setCanvasBackgroundColor}
            onFitCanvas={studio.fitCanvasToScreen}
            onCanvas100={studio.setCanvasTo100}
            onRotateCanvas={studio.rotateCanvas}
          />
          <StudioLayersPanel
            layers={studio.project.layers}
            selectionIds={studio.selection.ids}
            onSelect={studio.selectLayer}
            onToggleVisible={studio.toggleLayerVisible}
            onToggleLocked={studio.toggleLayerLocked}
            onDuplicate={studio.duplicateSelection}
            onDelete={() => requestConfirmation({
              title: 'Delete selected layers',
              message: `Delete ${studio.selection.ids.length || 1} selected layer${studio.selection.ids.length > 1 ? 's' : ''} from this thumbnail project?`,
              confirmLabel: 'Delete',
              tone: 'danger',
              onConfirm: () => studio.deleteSelection()
            })}
            onMove={studio.reorderLayer}
            onRename={studio.renameLayer}
            onMoveStack={studio.moveSelectionStack}
            onGroup={studio.groupSelection}
            onUngroup={studio.ungroupSelection}
            onMergeSelected={studio.mergeSelectedLayers}
            onToggleMask={studio.toggleLayerMask}
            onToggleClipping={studio.toggleClippingMask}
            onConvertSmartObject={studio.convertSelectionToSmartObject}
          />
        </div>
      </div>

      <StudioStatusbar
        canvasWidth={studio.project.canvas.width}
        canvasHeight={studio.project.canvas.height}
        zoomPercent={Math.round(studio.project.canvas.zoom * 100)}
        cursor={cursor}
        layer={studio.primaryLayer}
      />

      {showExport && (
        <StudioExportModal
          project={studio.project}
          primaryLayer={studio.primaryLayer}
          onClose={() => setShowExport(false)}
          onSaveBuffer={async ({ suggestedName, extension, mimeType, buffer }) => {
            await edifyApi.saveStudioBinary?.({
              suggestedName,
              extension,
              mimeType,
              buffer
            });
          }}
        />
      )}

      {showPremium && (
        <StudioPremiumModal
          feature={showPremium.feature}
          title={showPremium.title}
          onOpenPremium={() => setShowPlanModal(true)}
          onClose={() => setShowPremium(null)}
        />
      )}

      {showPlanModal && (
        <PremiumOfferModal
          reason="Unlock Thumbnail Studio Pro, AI creator tools, high resolution PNG exports, and premium creator packs."
          accountUser={bootstrap.accountUser ?? null}
          onClose={() => setShowPlanModal(false)}
          onConnectAccount={() => setShowAccount(true)}
          onAccessChange={(nextAccess) => {
            setPremiumAccess(nextAccess);
            pushToast({
              title: 'Premium updated',
              detail: 'Thumbnail Studio premium access was updated for this device.',
              tone: 'success'
            });
          }}
          pushToast={pushToast}
        />
      )}

      {showTutorial && (
        <StudioTutorialModal
          onClose={() => {
            localStorage.setItem('edify-studio-tutorial-seen', 'true');
            setShowTutorial(false);
          }}
        />
      )}

      {showAccount && (
        <AccountModal
          user={bootstrap.accountUser ?? null}
          recentProjects={bootstrap.recentProjects.map<ProjectSummary>((project) => ({
            ...project,
            source: project.path.toLowerCase().includes('cloud') ? 'cloud' : 'local'
          }))}
          busyProvider={accountBusyProvider}
          message={accountMessage}
          onClose={() => setShowAccount(false)}
          onProviderSelect={handleProviderSelect}
          onSignOut={handleStudioSignOut}
        />
      )}

      {showCommands && (
        <CommandPalette
          actions={commandActions}
          onClose={() => setShowCommands(false)}
        />
      )}

      {showShortcuts && (
        <StudioShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {showShare && (
        <StudioShareModal
          projectName={studio.project.name}
          shareSummary={shareSummary}
          reviewBrief={reviewBrief}
          busyAction={shareBusyAction}
          onClose={() => {
            if (!shareBusyAction) setShowShare(false);
          }}
          onCopySummary={async () => {
            setShareBusyAction('copy-summary');
            try {
              await copyTextToClipboard(shareSummary, 'Project summary copied', 'Thumbnail Studio summary copied to the clipboard.');
            } finally {
              setShareBusyAction(null);
            }
          }}
          onCopyReview={async () => {
            setShareBusyAction('copy-review');
            try {
              await copyTextToClipboard(reviewBrief, 'Review handoff copied', 'Client-ready review notes copied to the clipboard.');
            } finally {
              setShareBusyAction(null);
            }
          }}
          onExportPreview={handleSharePreviewExport}
          onExportPdf={handleSharePdfExport}
          onSaveBundle={handleShareBundleSave}
        />
      )}

      {confirmState && (
        <div className="modal-scrim">
          <section className="modal studio-confirm-modal">
            <header className="modal-header">
              <div>
                <span className="modal-eyebrow">Thumbnail Studio</span>
                <h2>{confirmState.title}</h2>
              </div>
            </header>
            <div className="studio-confirm-body">
              <p>{confirmState.message}</p>
            </div>
            <div className="dialog-actions studio-confirm-actions">
              <button className="ghost-button" type="button" onClick={() => setConfirmState(null)}>
                Cancel
              </button>
              <button
                className={confirmState.tone === 'danger' ? 'danger-button' : 'primary-button'}
                type="button"
                onClick={() => {
                  const action = confirmState.onConfirm;
                  setConfirmState(null);
                  action();
                }}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
