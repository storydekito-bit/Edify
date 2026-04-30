import { useCallback, useRef, useState } from 'react';
import { Command, FileVideo, Layers, Maximize2, Mic, NotebookTabs, Square } from 'lucide-react';
import { TopBar } from './TopBar';
import { LeftSidebar } from './panels/LeftSidebar';
import { PreviewPlayer } from './PreviewPlayer';
import { InspectorPanel } from './panels/InspectorPanel';
import { Timeline } from './timeline/Timeline';
import { edifyApi } from '../lib/bridge';
import { createGeneratedSoundAsset } from '../lib/generatedAudio';
import type { EditorController } from '../state/useEditorState';
import type { BootstrapInfo, MediaAsset, Toast } from '../types/edify';

type EditorShellProps = {
  editor: EditorController;
  bootstrap: BootstrapInfo | null;
  isBrowserMode: boolean;
  authUserName: string | null;
  onOpenAccount: () => void;
  onDesktopFeature: (title: string, detail: string) => void;
  onBackHome: () => void;
  onImportMedia: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onShortcuts: () => void;
  onSettings: () => void;
  onDropFiles: (files: FileList | File[]) => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

export function EditorShell({
  editor,
  bootstrap,
  isBrowserMode,
  authUserName,
  onOpenAccount,
  onDesktopFeature,
  onBackHome,
  onImportMedia,
  onSave,
  onSaveAs,
  onExport,
  onShortcuts,
  onSettings,
  onDropFiles,
  pushToast
}: EditorShellProps) {
  const [dropActive, setDropActive] = useState(false);
  const [leftWidth, setLeftWidth] = useState(520);
  const [rightWidth, setRightWidth] = useState(356);
  const [isRecording, setIsRecording] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const recordingStartedAt = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDropActive(false);
    const assetId = event.dataTransfer.getData('application/x-edify-asset');
    if (assetId) {
      const asset = editor.project.assets.find((item) => item.id === assetId);
      if (asset) {
        editor.addClipToTimeline(asset);
        pushToast({ title: 'Clip placed', detail: `${asset.name} added at playhead`, tone: 'success' });
      }
      return;
    }
    const soundName = event.dataTransfer.getData('application/x-edify-sound');
    if (soundName) {
      const duration = Number(event.dataTransfer.getData('application/x-edify-sound-duration')) || 1.2;
      const tag = event.dataTransfer.getData('application/x-edify-sound-tag') || 'Sound';
      const soundAsset = createGeneratedSoundAsset({ name: soundName, duration, tag });
      editor.addClipToTimeline(soundAsset);
      pushToast({ title: 'Sound placed', detail: `${soundName} added at playhead`, tone: 'success' });
      return;
    }
    const presetKind = event.dataTransfer.getData('application/x-edify-preset-kind');
    const presetName = event.dataTransfer.getData('application/x-edify-preset-name');
    if (presetKind === 'sticker' && presetName) {
      const content = event.dataTransfer.getData('application/x-edify-preset-content') || presetName;
      editor.addTextClip(presetName, editor.playhead, undefined, content, 3);
      pushToast({ title: 'Sticker placed', detail: `${presetName} added at playhead`, tone: 'success' });
      return;
    }
    if (event.dataTransfer.files.length > 0) {
      onDropFiles(event.dataTransfer.files);
    }
  }, [editor, onDropFiles, pushToast]);

  const toggleRecording = useCallback(async () => {
    if (isBrowserMode) {
      onDesktopFeature(
        'Microphone recording',
        'Voice recording, direct microphone capture, and desktop audio workflows are available in the Edify desktop application.'
      );
      return;
    }
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recordingStartedAt.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const buffer = await blob.arrayBuffer();
        const seconds = Math.max(0.5, (Date.now() - recordingStartedAt.current) / 1000);
        const asset = await edifyApi.saveRecording(`Edify voice ${new Date().toISOString().replace(/[:.]/g, '-')}`, buffer);
        if (asset) {
          const mediaAsset = { ...asset, duration: seconds } as MediaAsset;
          editor.addAssets([mediaAsset]);
          editor.addClipToTimeline(mediaAsset, undefined, editor.playhead);
          pushToast({ title: 'Voice recorded', detail: 'Audio added to the timeline', tone: 'success' });
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      pushToast({ title: 'Recording audio', detail: 'Speak now, then press Stop', tone: 'info' });
    } catch {
      pushToast({ title: 'Microphone unavailable', detail: 'Check Windows microphone permission for Edify.', tone: 'warning' });
    }
  }, [editor, isBrowserMode, isRecording, onDesktopFeature, pushToast]);

  const triggerDesktopFeature = useCallback((title: string, detail: string) => {
    onDesktopFeature(title, detail);
  }, [onDesktopFeature]);

  const handleMagicEdit = useCallback((style: 'cinematic' | 'gaming' | 'creator' | 'podcast' | 'travel' | 'luxury') => {
    if (isBrowserMode) {
      triggerDesktopFeature(
        'Magic Edit',
        `Magic Edit for ${style} workflows is available in the Edify desktop application, where the full montage builder, auto timing, and render pipeline are enabled.`
      );
      return;
    }
    editor.applyMagicEdit(style);
  }, [editor, isBrowserMode, triggerDesktopFeature]);

  const handleBeatSync = useCallback(() => {
    if (isBrowserMode) {
      triggerDesktopFeature(
        'Beat Sync',
        'Beat detection, sync markers, timing suggestions, and rhythm-driven edits are available in the Edify desktop application.'
      );
      return;
    }
    editor.applyBeatSync();
  }, [editor, isBrowserMode, triggerDesktopFeature]);

  const handleTemplate = useCallback((template: 'shorts' | 'gaming' | 'product' | 'trailer' | 'podcast' | 'travel' | 'fashion' | 'reaction' | 'music' | 'tutorial' | 'real-estate' | 'launch') => {
    if (isBrowserMode && ['trailer', 'music', 'launch', 'real-estate'].includes(template)) {
      triggerDesktopFeature(
        'Premium template flow',
        'This template uses the heavier desktop editing pipeline with richer transitions, styling, and export logic.'
      );
      return;
    }
    editor.applyVideoTemplate(template);
  }, [editor, isBrowserMode, triggerDesktopFeature]);

  const handleStudioFeature = useCallback((featureId: string) => {
    if (isBrowserMode) {
      triggerDesktopFeature(
        'Desktop-only studio tool',
        `The "${featureId}" studio feature is available in the Edify desktop application, together with the full premium workflow.`
      );
      return;
    }
    editor.applyStudioFeature(featureId);
  }, [editor, isBrowserMode, triggerDesktopFeature]);

  const desktopOnlyEffects = new Set([
    'Premium upscale',
    'Background blur',
    'Speed Ramp Shock',
    'Luxury Product Shine',
    'AI Aura Glow',
    'Portal Velocity FX',
    'Arena Impact Pulse',
    'Trailer Impact Grade'
  ]);

  const desktopOnlyTransitions = new Set([
    'Glitch Portal',
    'Shockwave Cut',
    'Impact Whip Pro',
    'Impact Whip Deluxe',
    'Film Burn Deluxe',
    'Whip Pan Pro',
    'Neon Speed Tunnel',
    'Rank Portal Pro'
  ]);

  const addTransitionSmart = useCallback((name: string) => {
    if (isBrowserMode && desktopOnlyTransitions.has(name)) {
      triggerDesktopFeature(
        'Desktop-only transition',
        `${name} is available in the Edify desktop application, where the heavier motion engine, blur pipeline, and premium transition renderer are enabled.`
      );
      return;
    }
    if (editor.selectedClipId) {
      editor.addTransitionToClip(editor.selectedClipId, name);
      pushToast({ title: 'Transition added', detail: `${name} added to the selected clip`, tone: 'success' });
      return;
    }
    const activeTrack = editor.project.tracks.find((track) => track.id === editor.activeTrackId && track.kind !== 'audio');
    const fallbackTrack = editor.project.tracks.find((track) => track.kind === 'video' || track.kind === 'overlay' || track.kind === 'text');
    const targetTrack = activeTrack ?? fallbackTrack;
    if (!targetTrack) {
      pushToast({ title: 'No visual track', detail: 'Add a video or text track before placing a transition.', tone: 'info' });
      return;
    }
    editor.addTransitionAt(targetTrack.id, editor.playhead, name);
    pushToast({ title: 'Transition placed', detail: `${name} placed near the playhead`, tone: 'success' });
  }, [desktopOnlyTransitions, editor, isBrowserMode, pushToast, triggerDesktopFeature]);

  const addEffectSmart = useCallback((name: string) => {
    if (isBrowserMode && desktopOnlyEffects.has(name)) {
      triggerDesktopFeature(
        'Desktop-only effect',
        `${name} is available in the Edify desktop application, where the heavier render path and premium effect stack are enabled.`
      );
      return;
    }
    if (editor.selectedClipId) {
      editor.addEffectToSelectedClip(name);
      return;
    }
    const visualClips = editor.project.tracks
      .filter((track) => !track.hidden && track.kind !== 'audio')
      .flatMap((track) => track.clips)
      .filter((clip) => clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'text');
    const visibleClip = visualClips.find((clip) => editor.playhead >= clip.start && editor.playhead <= clip.start + clip.duration);
    const targetClip = visibleClip ?? visualClips[0];
    if (targetClip) {
      editor.addEffectToClip(targetClip.id, name);
      return;
    }
    editor.addTextClip('AI Effect Preview', editor.playhead, undefined, name, 3);
  }, [desktopOnlyEffects, editor, isBrowserMode, triggerDesktopFeature]);

  return (
    <main
      className={`editor-shell ${dropActive ? 'is-drop-active' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDropActive(Array.from(event.dataTransfer.types).includes('Files'));
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleDrop}
    >
        <TopBar
        project={editor.project}
        saveStatus={editor.saveStatus}
        bootstrap={bootstrap}
        canUndo={editor.history.past.length > 0}
        canRedo={editor.history.future.length > 0}
        onBackHome={onBackHome}
        onImportMedia={onImportMedia}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onExport={onExport}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onShortcuts={onShortcuts}
        onSettings={onSettings}
        onPremium={() => {
          setFocusMode(false);
          editor.setActivePanel('premium');
        }}
      />

      <div
        className={`workspace-grid ${focusMode ? 'focus-mode' : ''}`}
        style={{ gridTemplateColumns: focusMode ? `0px 1fr 0px` : `${leftWidth}px 1fr ${rightWidth}px` }}
      >
        <LeftSidebar
          activePanel={editor.activePanel}
          onPanelChange={editor.setActivePanel}
          project={editor.project}
          selectedClip={editor.selectedClip}
          isBrowserMode={isBrowserMode}
          authUserName={authUserName}
          onOpenAccount={onOpenAccount}
          onDesktopFeature={onDesktopFeature}
          onImportMedia={onImportMedia}
          onAddText={editor.addTextClip}
          onAddEffect={addEffectSmart}
          onAddTransition={addTransitionSmart}
          onAddClip={(asset: MediaAsset) => editor.addClipToTimeline(asset)}
          onUpdateClip={editor.updateClip}
          onDeleteAsset={editor.deleteAsset}
          onExport={onExport}
          onRecordVoice={toggleRecording}
          isRecordingVoice={isRecording}
          onMagicEdit={handleMagicEdit}
          onBeatSync={handleBeatSync}
          onApplyVideoTemplate={handleTemplate}
          onStudioFeature={handleStudioFeature}
          pushToast={pushToast}
        />
        <button
          className="panel-resizer left"
          style={{ left: leftWidth - 4 }}
          aria-label="Resize left panel"
          onPointerDown={(event) => {
            const start = event.clientX;
            const initial = leftWidth;
            const move = (moveEvent: PointerEvent) => setLeftWidth(Math.min(680, Math.max(340, initial + moveEvent.clientX - start)));
            const up = () => {
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', up);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
          }}
        />

        <section className="center-stack">
          <PreviewPlayer editor={editor} />
          <div className="quick-strip">
            <button
              title="Reset workspace layout"
              onClick={() => {
                setFocusMode(false);
                setLeftWidth(520);
                setRightWidth(356);
              }}
            >
              <Layers size={16} />
              Layout
            </button>
            <button title="Distraction free mode" onClick={() => setFocusMode((current) => !current)}>
              <Maximize2 size={16} />
              {focusMode ? 'Exit focus' : 'Focus'}
            </button>
            <button title="Project notes" onClick={() => setNotesOpen(true)}>
              <NotebookTabs size={16} />
              Notes
            </button>
            <button title="Shortcut cheat sheet" onClick={onShortcuts}>
              <Command size={16} />
              Shortcuts
            </button>
            <button className={isRecording ? 'recording-active' : ''} title="Record voice" onClick={toggleRecording}>
              {isRecording ? <Square size={16} /> : <Mic size={16} />}
              {isRecording ? 'Stop' : 'Record'}
            </button>
            <span className="performance-pill">
              <FileVideo size={14} />
              Preview {bootstrap?.settings.previewQuality ?? 'Half'}
            </span>
          </div>
        </section>

        <button
          className="panel-resizer right"
          style={{ right: rightWidth - 4 }}
          aria-label="Resize inspector"
          onPointerDown={(event) => {
            const start = event.clientX;
            const initial = rightWidth;
            const move = (moveEvent: PointerEvent) => setRightWidth(Math.min(500, Math.max(320, initial - (moveEvent.clientX - start))));
            const up = () => {
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', up);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
          }}
        />
        <InspectorPanel editor={editor} />
      </div>

      <Timeline editor={editor} />

      {dropActive && (
        <div className="drop-overlay">
          <strong>Drop into Edify</strong>
          <span>Media lands in the library, assets land on the active timeline track.</span>
        </div>
      )}
      {notesOpen && (
        <div className="modal-scrim">
          <section className="modal notes-modal">
            <header className="modal-header">
              <div>
                <h2>Project Notes</h2>
                <p>{editor.project.name}</p>
              </div>
              <button className="icon-button" onClick={() => setNotesOpen(false)}>X</button>
            </header>
            <textarea value={editor.project.notes} readOnly />
          </section>
        </div>
      )}
    </main>
  );
}
