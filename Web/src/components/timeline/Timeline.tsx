import {
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Magnet,
  Minus,
  MousePointer2,
  Plus,
  Scissors,
  Trash2,
  Unlock,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { formatTime } from '../../lib/format';
import { createGeneratedSoundAsset, createWaveformForName } from '../../lib/generatedAudio';
import type { EditorController } from '../../state/useEditorState';
import type { Clip, Track } from '../../types/edify';

const trackHeaderWidth = 176;
const rulerHeight = 34;

function clampContextMenu(x: number, y: number) {
  return {
    x: Math.min(Math.max(8, x), window.innerWidth - 220),
    y: Math.min(Math.max(8, y), window.innerHeight - 188)
  };
}

export function Timeline({ editor }: { editor: EditorController }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);
  const [dropPreview, setDropPreview] = useState<{ trackId: string; x: number; kind: string; name: string } | null>(null);
  const [magneticTimeline, setMagneticTimeline] = useState(true);
  const width = Math.max(editor.project.duration + 10, 28) * editor.timelineZoom;
  const ticks = useMemo(() => {
    const step = editor.timelineZoom > 100 ? 1 : editor.timelineZoom > 56 ? 2 : 5;
    return Array.from({ length: Math.ceil(editor.project.duration / step) + 6 }, (_, index) => index * step);
  }, [editor.project.duration, editor.timelineZoom]);
  const snapPoints = useMemo(() => collectSnapPoints(editor.project.tracks, editor.project.markers, editor.project.duration), [editor.project.duration, editor.project.markers, editor.project.tracks]);

  return (
    <section className="timeline-panel" onClick={() => setContextMenu(null)}>
      <div className="timeline-toolbar">
        <div className="tool-cluster">
          <button className="active" title="Selection tool">
            <MousePointer2 size={16} />
          </button>
          <button className={magneticTimeline ? 'active magnetic-active' : ''} title={magneticTimeline ? 'Magnetic timeline on' : 'Magnetic timeline off'} onClick={() => setMagneticTimeline((current) => !current)}>
            <Magnet size={16} />
          </button>
          <button title="Split clip" onClick={editor.splitSelectedClip}>
            <Scissors size={16} />
          </button>
          <button title="Duplicate clip" onClick={editor.duplicateSelectedClip}>
            <Copy size={16} />
          </button>
          <button title="Move clip one layer up" onClick={() => editor.moveSelectedClipLayer('up')}>
            <ChevronUp size={16} />
          </button>
          <button title="Move clip one layer down" onClick={() => editor.moveSelectedClipLayer('down')}>
            <ChevronDown size={16} />
          </button>
          <button title="Delete clip" onClick={editor.deleteSelectedClip}>
            <Trash2 size={16} />
          </button>
        </div>
        <div className="timeline-status">
          <span><Magnet size={14} /> Snapping {magneticTimeline ? 'on' : 'off'}</span>
          <span>{editor.project.tracks.length} tracks</span>
          <span>{formatTime(editor.playhead)}</span>
        </div>
        <div className="zoom-control">
          <button onClick={() => editor.setTimelineZoom(editor.timelineZoom - 8)} title="Zoom out">
            <Minus size={15} />
          </button>
          <input
            type="range"
            min="36"
            max="180"
            value={editor.timelineZoom}
            onChange={(event) => editor.setTimelineZoom(Number(event.target.value))}
            aria-label="Timeline zoom"
          />
          <button onClick={() => editor.setTimelineZoom(editor.timelineZoom + 8)} title="Zoom in">
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div
        className="timeline-scroll"
        ref={scrollRef}
        onWheel={(event) => {
          if (event.ctrlKey) {
            event.preventDefault();
            editor.setTimelineZoom(editor.timelineZoom + (event.deltaY > 0 ? -6 : 6));
          }
        }}
      >
        <div className="timeline-content" style={{ width: width + trackHeaderWidth }}>
          <div className="track-header-spacer" />
          <div className="ruler" style={{ left: trackHeaderWidth, width }}>
            {ticks.map((tick) => (
              <button
                className="ruler-tick"
                key={tick}
                style={{ left: tick * editor.timelineZoom }}
                onClick={() => editor.setPlayhead(tick)}
              >
                <span>{formatTime(tick).slice(0, 5)}</span>
              </button>
            ))}
            {editor.project.markers.map((marker) => (
              <button
                className="timeline-marker"
                key={marker.id}
                style={{ left: marker.time * editor.timelineZoom, borderColor: marker.color }}
                title={marker.note ?? marker.label}
                onClick={() => editor.setPlayhead(marker.time)}
              >
                {marker.label}
              </button>
            ))}
          </div>

          <button
            className="playhead"
            style={{ left: trackHeaderWidth + editor.playhead * editor.timelineZoom }}
            onPointerDown={(event) => {
              const rect = scrollRef.current?.getBoundingClientRect();
              const startScroll = scrollRef.current?.scrollLeft ?? 0;
              const move = (moveEvent: PointerEvent) => {
                if (!rect) return;
                const x = moveEvent.clientX - rect.left + startScroll - trackHeaderWidth;
                editor.setPlayhead(x / editor.timelineZoom);
              };
              const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
              };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          >
            <span />
          </button>

          <div className="tracks" style={{ paddingTop: rulerHeight }}>
            {editor.project.tracks.map((track) => (
              <TimelineTrack
                key={track.id}
                track={track}
                editor={editor}
                width={width}
                onContextClip={(clipId, x, y) => setContextMenu({ clipId, ...clampContextMenu(x, y) })}
                dropPreview={dropPreview?.trackId === track.id ? dropPreview : null}
                onDropPreview={setDropPreview}
                magneticTimeline={magneticTimeline}
                snapPoints={snapPoints}
              />
            ))}
          </div>
        </div>
      </div>

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button onClick={editor.splitSelectedClip}>Split at playhead</button>
          <button onClick={editor.duplicateSelectedClip}>Duplicate clip</button>
          <button onClick={() => editor.moveSelectedClipLayer('up')}>Move layer up</button>
          <button onClick={() => editor.moveSelectedClipLayer('down')}>Move layer down</button>
          <button onClick={() => editor.addEffectToSelectedClip('Glow')}>Paste style preset</button>
          <button onClick={editor.deleteSelectedClip}>Ripple delete</button>
        </div>
      )}
    </section>
  );
}

function TimelineTrack({
  track,
  editor,
  width,
  onContextClip,
  dropPreview,
  onDropPreview,
  magneticTimeline,
  snapPoints
}: {
  track: Track;
  editor: EditorController;
  width: number;
  onContextClip: (clipId: string, x: number, y: number) => void;
  dropPreview: { trackId: string; x: number; kind: string; name: string } | null;
  onDropPreview: (preview: { trackId: string; x: number; kind: string; name: string } | null) => void;
  magneticTimeline: boolean;
  snapPoints: number[];
}) {
  return (
    <div
      className={`timeline-track track-${track.kind}`}
      data-track-id={track.id}
      data-track-kind={track.kind}
      style={{ height: track.height }}
      onDragOver={(event) => {
        event.preventDefault();
        const preset = readPresetDrop(event.dataTransfer);
        const sound = readSoundDrop(event.dataTransfer);
        const assetId = event.dataTransfer.getData('application/x-edify-asset');
        const asset = assetId ? editor.project.assets.find((item) => item.id === assetId) : undefined;
        if (!preset && !sound && !asset) return;
        const rect = event.currentTarget.querySelector('.track-lane')?.getBoundingClientRect();
        const x = rect ? event.clientX - rect.left : 0;
        const time = magneticTimeline ? snapTime(x / editor.timelineZoom, snapPoints) : x / editor.timelineZoom;
        const transitionClip =
          preset?.kind === 'transition'
            ? nearestTransitionPoint(track, time)
            : undefined;
        onDropPreview({
          trackId: track.id,
          x: transitionClip ? transitionClip.at * editor.timelineZoom : x,
          kind: preset?.kind ?? sound?.tag ?? asset?.kind ?? 'media',
          name: preset?.name ?? sound?.name ?? asset?.name ?? 'Media'
        });
      }}
      onDragLeave={() => onDropPreview(null)}
      onDrop={(event) => {
        event.preventDefault();
        onDropPreview(null);
        const assetId = event.dataTransfer.getData('application/x-edify-asset');
        const rect = event.currentTarget.querySelector('.track-lane')?.getBoundingClientRect();
        const x = rect ? event.clientX - rect.left : 0;
        const time = magneticTimeline ? snapTime(x / editor.timelineZoom, snapPoints) : x / editor.timelineZoom;
        const preset = readPresetDrop(event.dataTransfer);
        if (preset) {
          editor.applyPresetAt(track.id, time, preset.kind, preset.name, preset.content);
          return;
        }
        const sound = readSoundDrop(event.dataTransfer);
        if (sound) {
          const soundAsset = createGeneratedSoundAsset(sound);
          editor.addClipToTimeline(soundAsset, track.id, time);
          return;
        }
        const asset = editor.project.assets.find((item) => item.id === assetId);
        if (!asset) return;
        editor.addClipToTimeline(asset, track.id, time);
      }}
    >
      <div className="track-header">
        <strong>{track.name}</strong>
        <small>{track.kind}</small>
        <div>
          <button
            title={track.locked ? 'Unlock track' : 'Lock track'}
            onClick={() => editor.updateTrack(track.id, (current) => ({ ...current, locked: !current.locked }))}
          >
            {track.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button
            title={track.muted ? 'Unmute track' : 'Mute track'}
            onClick={() => editor.updateTrack(track.id, (current) => ({ ...current, muted: !current.muted }))}
          >
            {track.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <button
            title={track.hidden ? 'Show track' : 'Hide track'}
            onClick={() => editor.updateTrack(track.id, (current) => ({ ...current, hidden: !current.hidden }))}
          >
            {track.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>
      <div className="track-lane" style={{ width }}>
        <div className="beat-grid" />
        {dropPreview && (
          <div className={`timeline-drop-preview drop-${slugify(dropPreview.kind)}`} style={{ left: dropPreview.x }}>
            <span>{dropPreview.kind}</span>
            <strong>{dropPreview.name}</strong>
          </div>
        )}
        {track.clips.map((clip) => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            waveform={editor.project.assets.find((asset) => asset.id === clip.assetId)?.waveform}
            selected={editor.selectedClipId === clip.id}
            pxPerSecond={editor.timelineZoom}
            magneticTimeline={magneticTimeline}
            snapPoints={snapPoints}
            onSelect={() => editor.selectClip(clip.id)}
            onMove={(start, targetTrackId) => editor.moveClip(clip.id, start, targetTrackId ?? track.id)}
            onResize={(edge, delta) => editor.resizeClip(clip.id, edge, delta)}
            onApplyPreset={(kind, name, time, content) => {
              if (kind === 'transition') {
                editor.addTransitionAt(track.id, time ?? clip.start + clip.duration, name);
                return;
              }
              if (kind === 'text' || kind === 'sticker') {
                editor.addTextClip(name, clip.start, track.id, content ?? (kind === 'sticker' ? name : undefined));
                return;
              }
              editor.addEffectToClip(clip.id, name);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              editor.selectClip(clip.id);
              onContextClip(clip.id, event.clientX, event.clientY);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ClipBlock({
  clip,
  waveform,
  selected,
  pxPerSecond,
  onSelect,
  onMove,
  onResize,
  onApplyPreset,
  onContextMenu,
  magneticTimeline,
  snapPoints
}: {
  clip: Clip;
  waveform?: number[];
  selected: boolean;
  pxPerSecond: number;
  magneticTimeline: boolean;
  snapPoints: number[];
  onSelect: () => void;
  onMove: (start: number, targetTrackId?: string) => void;
  onResize: (edge: 'start' | 'end', delta: number) => void;
  onApplyPreset: (kind: 'effect' | 'filter' | 'transition' | 'text' | 'sticker', name: string, time?: number, content?: string) => void;
  onContextMenu: (event: MouseEvent) => void;
}) {
  const startX = clip.start * pxPerSecond;
  const width = Math.max(24, clip.duration * pxPerSecond);

  return (
    <div
      className={`clip-block clip-${clip.kind} ${selected ? 'selected' : ''}`}
      style={{
        left: startX,
        width,
        borderColor: clip.color,
        background: `linear-gradient(135deg, ${clip.color}55, rgba(18, 22, 33, 0.94))`
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).dataset.resize) return;
        onSelect();
        const initialX = event.clientX;
        const initialStart = clip.start;
        const move = (moveEvent: PointerEvent) => {
          const targetTrackId = trackIdFromPoint(moveEvent.clientX, moveEvent.clientY);
          const nextStart = initialStart + (moveEvent.clientX - initialX) / pxPerSecond;
          onMove(magneticTimeline ? snapTime(nextStart, snapPoints) : nextStart, targetTrackId);
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }}
      onContextMenu={onContextMenu}
      onDragOver={(event) => {
        if (readPresetDrop(event.dataTransfer)) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        const preset = readPresetDrop(event.dataTransfer);
        if (!preset) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect();
        const rect = event.currentTarget.getBoundingClientRect();
        const localTime = clip.start + (event.clientX - rect.left) / pxPerSecond;
        onApplyPreset(preset.kind, preset.name, magneticTimeline ? snapTime(localTime, snapPoints) : localTime, preset.content);
      }}
    >
      <button
        className="resize-handle start"
        data-resize="start"
        aria-label="Trim start"
        onPointerDown={(event) => {
          event.stopPropagation();
          let lastX = event.clientX;
          const move = (moveEvent: PointerEvent) => {
            const delta = (moveEvent.clientX - lastX) / pxPerSecond;
            lastX = moveEvent.clientX;
            onResize('start', delta);
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
      />
      <div className="clip-label">
        <strong>{clip.name}</strong>
        <span>{formatTime(clip.duration)}</span>
      </div>
      {clip.kind === 'audio' && <Waveform values={waveform ?? createWaveformForName(clip.name, 34)} />}
      {clip.effects.length > 0 && (
        <div className="clip-fx-row">
          {clip.effects.slice(0, 3).map((effect) => (
            <span className={`clip-fx-chip fx-${slugify(effect.name)}`} key={effect.id}>
              {effect.name}
            </span>
          ))}
          {clip.effects.length > 3 && <span className="clip-badge">+{clip.effects.length - 3}</span>}
        </div>
      )}
      {clip.transition && (
        <span
          className={`transition-chip placement-${clip.transition.placement ?? 'end'}`}
          style={{ left: `${(((clip.transition.at ?? clip.start + clip.duration) - clip.start) / clip.duration) * 100}%` }}
        >
          {clip.transition.style}
        </span>
      )}
      <button
        className="resize-handle end"
        data-resize="end"
        aria-label="Trim end"
        onPointerDown={(event) => {
          event.stopPropagation();
          let lastX = event.clientX;
          const move = (moveEvent: PointerEvent) => {
            const delta = (moveEvent.clientX - lastX) / pxPerSecond;
            lastX = moveEvent.clientX;
            onResize('end', delta);
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
      />
    </div>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function readPresetDrop(dataTransfer: DataTransfer): { kind: 'effect' | 'filter' | 'transition' | 'text' | 'sticker'; name: string; content?: string } | null {
  const name = dataTransfer.getData('application/x-edify-preset-name');
  const rawKind = dataTransfer.getData('application/x-edify-preset-kind');
  const content = dataTransfer.getData('application/x-edify-preset-content') || undefined;
  if (name && (rawKind === 'effect' || rawKind === 'filter' || rawKind === 'transition' || rawKind === 'text' || rawKind === 'sticker')) {
    return { kind: rawKind, name, content };
  }
  const effect = dataTransfer.getData('application/x-edify-effect');
  if (effect) return { kind: 'effect', name: effect };
  const filter = dataTransfer.getData('application/x-edify-filter');
  if (filter) return { kind: 'filter', name: filter };
  const transition = dataTransfer.getData('application/x-edify-transition');
  if (transition) return { kind: 'transition', name: transition };
  const text = dataTransfer.getData('application/x-edify-text');
  if (text) return { kind: 'text', name: text };
  const sticker = dataTransfer.getData('application/x-edify-sticker');
  if (sticker) return { kind: 'sticker', name: sticker, content };
  return null;
}

function readSoundDrop(dataTransfer: DataTransfer): { name: string; duration: number; tag: string } | null {
  const name = dataTransfer.getData('application/x-edify-sound');
  if (!name) return null;
  return {
    name,
    duration: Number(dataTransfer.getData('application/x-edify-sound-duration')) || 1.2,
    tag: dataTransfer.getData('application/x-edify-sound-tag') || 'Sound'
  };
}

function trackIdFromPoint(x: number, y: number) {
  const element = document.elementFromPoint(x, y);
  return element?.closest<HTMLElement>('.timeline-track')?.dataset.trackId;
}

function nearestTransitionPoint(track: Track, time: number) {
  const clips = [...track.clips].sort((a, b) => a.start - b.start);
  const edges = clips.flatMap((clip) => [
    { at: clip.start, distance: Math.abs(time - clip.start) },
    { at: clip.start + clip.duration, distance: Math.abs(time - (clip.start + clip.duration)) }
  ]);
  const seams = clips.slice(0, -1).map((clip, index) => {
    const next = clips[index + 1];
    const seam = (clip.start + clip.duration + next.start) / 2;
    return { at: clip.start + clip.duration, distance: Math.abs(time - seam) };
  });
  return [...seams, ...edges].sort((a, b) => a.distance - b.distance)[0];
}

function collectSnapPoints(tracks: Track[], markers: Array<{ time: number }>, duration: number) {
  const points = new Set<number>([0, Math.max(0, duration)]);
  markers.forEach((marker) => points.add(marker.time));
  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      points.add(clip.start);
      points.add(clip.start + clip.duration);
    });
  });
  for (let second = 0; second <= Math.ceil(duration) + 8; second += 1) {
    points.add(second);
  }
  return [...points].filter(Number.isFinite).sort((a, b) => a - b);
}

function snapTime(time: number, points: number[], threshold = 0.12) {
  let best = time;
  let bestDistance = threshold;
  for (const point of points) {
    const distance = Math.abs(point - time);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return Math.max(0, Math.round(best * 30) / 30);
}

function Waveform({ values }: { values: number[] }) {
  return (
    <div className="waveform">
      {values.slice(0, 38).map((value, index) => (
        <span key={index} style={{ height: `${Math.max(14, Math.min(96, value))}%` }} />
      ))}
    </div>
  );
}
