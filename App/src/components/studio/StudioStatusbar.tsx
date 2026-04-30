import { Crosshair, Pointer, ZoomIn } from 'lucide-react';
import type { StudioLayer } from '../../types/studio';

type StudioStatusbarProps = {
  canvasWidth: number;
  canvasHeight: number;
  zoomPercent: number;
  cursor: { x: number; y: number };
  layer: StudioLayer | null;
};

export function StudioStatusbar({ canvasWidth, canvasHeight, zoomPercent, cursor, layer }: StudioStatusbarProps) {
  return (
    <footer className="studio-statusbar">
      <span><Pointer size={13} /> {Math.round(cursor.x)}, {Math.round(cursor.y)}</span>
      <span><Crosshair size={13} /> {canvasWidth} x {canvasHeight}</span>
      <span><ZoomIn size={13} /> {zoomPercent}%</span>
      <span>{layer ? `${layer.name} · ${Math.round(layer.width)} x ${Math.round(layer.height)}` : 'No layer selected'}</span>
    </footer>
  );
}
