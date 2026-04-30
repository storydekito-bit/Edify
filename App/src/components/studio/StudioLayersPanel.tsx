import { Copy, Eye, EyeOff, Folder, Layers3, Lock, LockOpen, MoreHorizontal, ScissorsLineDashed, Trash2 } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudioLayer } from '../../types/studio';

type StudioLayersPanelProps = {
  layers: StudioLayer[];
  selectionIds: string[];
  onSelect: (layerId: string, additive?: boolean) => void;
  onToggleVisible: (layerId: string) => void;
  onToggleLocked: (layerId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (layerId: string, direction: -1 | 1) => void;
  onRename: (layerId: string, name: string) => void;
  onMoveStack: (mode: 'up' | 'down' | 'front' | 'back') => void;
  onGroup: () => void;
  onUngroup: () => void;
  onMergeSelected: () => void;
  onToggleMask: (layerId: string) => void;
  onToggleClipping: (layerId: string) => void;
  onConvertSmartObject: () => void;
};

export function StudioLayersPanel({
  layers,
  selectionIds,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onDuplicate,
  onDelete,
  onMove,
  onRename,
  onMoveStack,
  onGroup,
  onUngroup,
  onMergeSelected,
  onToggleMask,
  onToggleClipping,
  onConvertSmartObject
}: StudioLayersPanelProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layerId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedLayer = useMemo(() => layers.find((layer) => layer.id === contextMenu?.layerId) ?? null, [contextMenu?.layerId, layers]);

  const openContextMenu = (x: number, y: number, layerId: string) => {
    const menuWidth = 252;
    const padding = 14;
    setContextMenu({
      x: Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding)),
      y: Math.max(padding, Math.min(y, window.innerHeight - 120)),
      layerId
    });
  };

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const padding = 14;
    const rect = contextMenuRef.current.getBoundingClientRect();
    let nextX = contextMenu.x;
    let nextY = contextMenu.y;
    if (rect.right > window.innerWidth - padding) {
      nextX = Math.max(padding, contextMenu.x - (rect.right - (window.innerWidth - padding)));
    }
    if (rect.bottom > window.innerHeight - padding) {
      nextY = Math.max(padding, contextMenu.y - rect.height + 12);
    }
    if (rect.top < padding) {
      nextY = padding;
    }
    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu((current) => current ? { ...current, x: nextX, y: nextY } : current);
    }
  }, [contextMenu]);

  return (
    <section className="studio-layers-panel" onClick={() => setContextMenu(null)}>
      <div className="studio-panel-header">
        <strong><Layers3 size={15} /> Layers</strong>
        <small>{layers.length} total</small>
      </div>
      <div className="studio-layers-list">
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            className={`studio-layer-row ${selectionIds.includes(layer.id) ? 'is-selected' : ''}`}
            onClick={(event) => onSelect(layer.id, event.shiftKey)}
            onContextMenu={(event) => {
              event.preventDefault();
              openContextMenu(event.clientX, event.clientY, layer.id);
            }}
          >
            <button type="button" className="studio-layer-toggle" onClick={(event) => {
              event.stopPropagation();
              onToggleVisible(layer.id);
            }}>
              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <div className="studio-layer-meta">
              <strong>{layer.name}</strong>
              <small>{layer.kind}{layer.smartObject ? ' · smart' : ''}{layer.premium ? ' · Pro' : ''}</small>
            </div>
            <button type="button" className="studio-layer-toggle" onClick={(event) => {
              event.stopPropagation();
              onToggleLocked(layer.id);
            }}>
              {layer.locked ? <Lock size={14} /> : <LockOpen size={14} />}
            </button>
            <button type="button" className="studio-layer-toggle" onClick={(event) => {
              event.stopPropagation();
              openContextMenu(event.clientX, event.clientY, layer.id);
            }}>
              <MoreHorizontal size={14} />
            </button>
          </div>
        ))}
      </div>

      {contextMenu && selectedLayer && createPortal(
        <div
          ref={contextMenuRef}
          className="context-menu studio-layer-context"
          style={{ left: contextMenu.x, top: contextMenu.y, maxHeight: `${Math.max(140, window.innerHeight - contextMenu.y - 18)}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button onClick={() => {
            const nextName = window.prompt('Rename layer', selectedLayer.name)?.trim();
            if (nextName) onRename(selectedLayer.id, nextName);
            setContextMenu(null);
          }}>
            Rename
          </button>
          <button onClick={() => {
            onMove(selectedLayer.id, 1);
            setContextMenu(null);
          }}>
            Move up
          </button>
          <button onClick={() => {
            onMove(selectedLayer.id, -1);
            setContextMenu(null);
          }}>
            Move down
          </button>
          <button onClick={() => {
            onSelect(selectedLayer.id);
            onMoveStack('front');
            setContextMenu(null);
          }}>
            Bring to front
          </button>
          <button onClick={() => {
            onSelect(selectedLayer.id);
            onMoveStack('back');
            setContextMenu(null);
          }}>
            Send to back
          </button>
          <button onClick={() => {
            onSelect(selectedLayer.id);
            onDuplicate();
            setContextMenu(null);
          }}>
            <Copy size={14} /> Duplicate
          </button>
          <button onClick={() => {
            onSelect(selectedLayer.id);
            onGroup();
            setContextMenu(null);
          }}>
            <Folder size={14} /> Group selection
          </button>
          <button onClick={() => {
            onSelect(selectedLayer.id);
            onUngroup();
            setContextMenu(null);
          }}>
            <ScissorsLineDashed size={14} /> Ungroup
          </button>
          <button onClick={() => {
            onSelect(selectedLayer.id);
            onMergeSelected();
            setContextMenu(null);
          }}>
            Merge selected
          </button>
          <button onClick={() => {
            onToggleMask(selectedLayer.id);
            setContextMenu(null);
          }}>
            {selectedLayer.maskEnabled ? 'Disable mask' : 'Enable mask'}
          </button>
          <button onClick={() => {
            onToggleClipping(selectedLayer.id);
            setContextMenu(null);
          }}>
            {selectedLayer.clippingMask ? 'Disable clipping mask' : 'Clip to layer below'}
          </button>
          <button onClick={() => {
            onSelect(selectedLayer.id);
            onConvertSmartObject();
            setContextMenu(null);
          }}>
            {selectedLayer.smartObject ? 'Disable smart object' : 'Convert to smart object'}
          </button>
          <button className="danger-menu-item" onClick={() => {
            onSelect(selectedLayer.id);
            onDelete();
            setContextMenu(null);
          }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>,
        document.body
      )}
    </section>
  );
}
