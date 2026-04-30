import { useEffect, useMemo, useRef, useState } from 'react';
import type { StudioGuide, StudioLayer, StudioPoint, StudioProject, StudioShapeLayer, StudioTheme, StudioToolId } from '../../types/studio';

type StudioCanvasAreaProps = {
  project: StudioProject;
  theme: StudioTheme;
  layers: StudioLayer[];
  selectionIds: string[];
  primaryLayer: StudioLayer | null;
  activeTool: StudioToolId;
  premiumEnabled: boolean;
  guides: StudioGuide[];
  beforeAfter: boolean;
  onSelectLayer: (layerId: string, additive?: boolean) => void;
  onSelectMany: (layerIds: string[]) => void;
  onClearSelection: () => void;
  onMoveSelectionBy: (deltaX: number, deltaY: number, commit?: boolean) => void;
  onResizePrimary: (width: number, height: number, x?: number, y?: number, commit?: boolean) => void;
  onRotatePrimary: (rotation: number, commit?: boolean) => void;
  onSetCanvasZoom: (zoom: number) => void;
  onSetCanvasPan: (x: number, y: number) => void;
  onSetGuides: (guides: StudioGuide[]) => void;
  onCropRect: (rect: { x: number; y: number; width: number; height: number }) => void;
  onAddTextAt: (x: number, y: number) => void;
  onAddShapeAt: (shape: StudioShapeLayer['shape'], x: number, y: number) => void;
  onApplyToolAt: (tool: StudioToolId, point: StudioPoint, targetLayerId?: string | null) => void;
  onRequestPremiumTool: (tool: string) => void;
  onCursorMove: (cursor: { x: number; y: number }) => void;
};

type DragState =
  | {
      mode: 'move';
      pointerX: number;
      pointerY: number;
    }
  | {
      mode: 'pan';
      pointerX: number;
      pointerY: number;
      panX: number;
      panY: number;
    }
  | {
      mode: 'resize';
      handle: 'nw' | 'ne' | 'sw' | 'se';
      pointerX: number;
      pointerY: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      mode: 'rotate';
      centerX: number;
      centerY: number;
      startRotation: number;
    }
  | {
      mode: 'marquee' | 'crop';
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }
  | {
      mode: 'lasso';
      points: StudioPoint[];
    };

function cssBlendMode(mode: StudioLayer['blendMode']) {
  switch (mode) {
    case 'soft-light':
      return 'soft-light';
    case 'hard-light':
      return 'hard-light';
    default:
      return mode;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function effectStyle(layer: StudioLayer) {
  const filters: string[] = [];
  if (layer.adjustments.brightness) filters.push(`brightness(${1 + layer.adjustments.brightness / 100})`);
  if (layer.adjustments.contrast) filters.push(`contrast(${1 + layer.adjustments.contrast / 100})`);
  if (layer.adjustments.saturation) filters.push(`saturate(${1 + layer.adjustments.saturation / 100})`);
  if (layer.adjustments.hue) filters.push(`hue-rotate(${layer.adjustments.hue}deg)`);
  if (layer.adjustments.temperature) filters.push(`sepia(${Math.max(0, layer.adjustments.temperature) / 220})`);
  if (layer.adjustments.blackAndWhite) filters.push(`grayscale(${layer.adjustments.blackAndWhite / 100})`);
  if (layer.adjustments.invert) filters.push(`invert(${layer.adjustments.invert / 100})`);
  if (layer.filters.gaussianBlur) filters.push(`blur(${layer.filters.gaussianBlur}px)`);
  if (layer.filters.motionBlur) filters.push(`blur(${Math.max(0, layer.filters.motionBlur / 5)}px)`);
  if (layer.filters.pixelate) filters.push(`contrast(${1 + layer.filters.pixelate / 140})`);
  if (layer.filters.dropShadow) filters.push(`drop-shadow(0 10px ${Math.max(1, layer.filters.dropShadow)}px rgba(0,0,0,.28))`);
  if (layer.filters.glow || layer.filters.robloxGlow) filters.push(`drop-shadow(0 0 ${Math.max(layer.filters.glow, layer.filters.robloxGlow)}px rgba(66,232,255,.38))`);
  if (layer.filters.vintage) filters.push(`sepia(${layer.filters.vintage / 100})`);
  if (layer.filters.cinematic) filters.push(`contrast(${1 + layer.filters.cinematic / 160}) saturate(${1 - layer.filters.cinematic / 420})`);
  if (layer.filters.youtubeEnhance) filters.push(`contrast(${1 + layer.filters.youtubeEnhance / 110}) saturate(${1 + layer.filters.youtubeEnhance / 140})`);
  if (layer.filters.sharpen) filters.push(`contrast(${1 + layer.filters.sharpen / 180})`);
  return {
    opacity: layer.opacity,
    mixBlendMode: cssBlendMode(layer.blendMode) as any,
    filter: filters.join(' ') || 'none',
    clipPath: layer.maskEnabled
      ? layer.maskInverted
        ? 'ellipse(34% 34% at 50% 50%)'
        : 'inset(5% 5% 5% 5% round 18px)'
      : undefined,
    transform: `translate(${layer.x}px, ${layer.y}px) rotate(${layer.rotation}deg)`,
    boxShadow: layer.filters.innerShadow
      ? `inset 0 0 ${Math.max(1, layer.filters.innerShadow)}px rgba(0,0,0,.18)`
      : undefined
  };
}

function shapeElement(layer: StudioShapeLayer) {
  if (layer.shape === 'ellipse') {
    return <div className="studio-shape studio-shape-ellipse" style={{ width: layer.width, height: layer.height, background: layer.fill, border: `${layer.strokeWidth}px solid ${layer.strokeColor}` }} />;
  }
  if (layer.shape === 'line') {
    return <div className="studio-shape studio-shape-line" style={{ width: layer.width, height: layer.height }}><i style={{ borderColor: layer.strokeColor, borderWidth: layer.strokeWidth }} /></div>;
  }
  if (layer.shape === 'arrow') {
    return <div className="studio-shape studio-shape-arrow" style={{ width: layer.width, height: layer.height, color: layer.strokeColor }}><i style={{ borderTopWidth: layer.strokeWidth, borderColor: layer.strokeColor }} /><b style={{ borderColor: layer.strokeColor }} /></div>;
  }
  if (layer.shape === 'polygon' && layer.points?.length) {
    const maxX = Math.max(...layer.points.map((point) => point.x), 1);
    const maxY = Math.max(...layer.points.map((point) => point.y), 1);
    return (
      <svg className="studio-shape" width={layer.width} height={layer.height} viewBox={`0 0 ${maxX} ${maxY}`}>
        <polygon
          points={layer.points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill={layer.fill}
          stroke={layer.strokeColor}
          strokeWidth={layer.strokeWidth}
        />
      </svg>
    );
  }
  return (
    <div
      className="studio-shape"
      style={{
        width: layer.width,
        height: layer.height,
        background: layer.fill,
        border: `${layer.strokeWidth}px solid ${layer.strokeColor}`,
        borderRadius: layer.shape === 'rounded-rectangle' ? `${layer.radius ?? 24}px` : 0
      }}
    />
  );
}

function rectFromPoints(startX: number, startY: number, currentX: number, currentY: number) {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  return { x, y, width, height };
}

function pointInPolygon(point: StudioPoint, polygon: StudioPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const intersects =
      polygon[i].y > point.y !== polygon[j].y > point.y &&
      point.x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / ((polygon[j].y - polygon[i].y) || 1) + polygon[i].x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function StudioCanvasArea({
  project,
  theme,
  layers,
  selectionIds,
  primaryLayer,
  activeTool,
  premiumEnabled,
  guides,
  beforeAfter,
  onSelectLayer,
  onSelectMany,
  onClearSelection,
  onMoveSelectionBy,
  onResizePrimary,
  onRotatePrimary,
  onSetCanvasZoom,
  onSetCanvasPan,
  onSetGuides,
  onCropRect,
  onAddTextAt,
  onAddShapeAt,
  onApplyToolAt,
  onRequestPremiumTool,
  onCursorMove
}: StudioCanvasAreaProps) {
  const artboardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [hoverCursor, setHoverCursor] = useState('default');
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<StudioPoint[]>([]);

  const scale = project.canvas.zoom;
  const previewLayers = beforeAfter ? layers.slice(0, Math.max(1, Math.floor(layers.length / 2))) : layers;

  const checkerboardStyle = theme === 'dark'
    ? 'linear-gradient(45deg, rgba(255,255,255,.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.06) 75%)'
    : 'linear-gradient(45deg, rgba(0,0,0,.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.06) 75%)';

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const dragState = dragRef.current;
      const artboard = artboardRef.current;
      if (!artboard) return;
      const rect = artboard.getBoundingClientRect();
      const canvasX = (event.clientX - rect.left) / scale;
      const canvasY = (event.clientY - rect.top) / scale;
      onCursorMove({ x: canvasX, y: canvasY });

      if (!dragState) return;
      if (dragState.mode === 'pan') {
        onSetCanvasPan(dragState.panX + (event.clientX - dragState.pointerX), dragState.panY + (event.clientY - dragState.pointerY));
        return;
      }
      if (dragState.mode === 'move') {
        onMoveSelectionBy((event.clientX - dragState.pointerX) / scale, (event.clientY - dragState.pointerY) / scale, false);
        dragState.pointerX = event.clientX;
        dragState.pointerY = event.clientY;
        return;
      }
      if (dragState.mode === 'resize' && primaryLayer) {
        const deltaX = (event.clientX - dragState.pointerX) / scale;
        const deltaY = (event.clientY - dragState.pointerY) / scale;
        let width = dragState.width;
        let height = dragState.height;
        let x = dragState.x;
        let y = dragState.y;
        if (dragState.handle === 'se') {
          width += deltaX;
          height += deltaY;
        }
        if (dragState.handle === 'sw') {
          width -= deltaX;
          height += deltaY;
          x += deltaX;
        }
        if (dragState.handle === 'ne') {
          width += deltaX;
          height -= deltaY;
          y += deltaY;
        }
        if (dragState.handle === 'nw') {
          width -= deltaX;
          height -= deltaY;
          x += deltaX;
          y += deltaY;
        }
        onResizePrimary(Math.max(24, width), Math.max(24, height), x, y, false);
        return;
      }
      if (dragState.mode === 'rotate' && primaryLayer) {
        const angle = Math.atan2(canvasY - dragState.centerY, canvasX - dragState.centerX) * (180 / Math.PI);
        onRotatePrimary(dragState.startRotation + angle, false);
        return;
      }
      if (dragState.mode === 'marquee' || dragState.mode === 'crop') {
        setMarqueeRect(rectFromPoints(dragState.startX, dragState.startY, canvasX, canvasY));
        dragState.currentX = canvasX;
        dragState.currentY = canvasY;
        return;
      }
      if (dragState.mode === 'lasso') {
        const nextPoints = [...dragState.points, { x: canvasX, y: canvasY }];
        dragState.points = nextPoints;
        setLassoPoints(nextPoints);
      }
    };

    const up = () => {
      const dragState = dragRef.current;
      dragRef.current = null;
      onSetGuides([]);
      if (!dragState) return;
      if (dragState.mode === 'move' || dragState.mode === 'resize' || dragState.mode === 'rotate') {
        return;
      }
      if (dragState.mode === 'marquee') {
        const rect = rectFromPoints(dragState.startX, dragState.startY, dragState.currentX, dragState.currentY);
        const ids = previewLayers
          .filter((layer) => layer.visible)
          .filter((layer) => layer.x < rect.x + rect.width && layer.x + layer.width > rect.x && layer.y < rect.y + rect.height && layer.y + layer.height > rect.y)
          .map((layer) => layer.id);
        if (ids.length) onSelectMany(ids);
        else onClearSelection();
        setMarqueeRect(null);
        return;
      }
      if (dragState.mode === 'crop') {
        const rect = rectFromPoints(dragState.startX, dragState.startY, dragState.currentX, dragState.currentY);
        if (rect.width > 32 && rect.height > 32) {
          onCropRect(rect);
        }
        setMarqueeRect(null);
        return;
      }
      if (dragState.mode === 'lasso') {
        const ids = previewLayers
          .filter((layer) => layer.visible)
          .filter((layer) => {
            const center = { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
            return pointInPolygon(center, dragState.points);
          })
          .map((layer) => layer.id);
        if (ids.length) onSelectMany(ids);
        setLassoPoints([]);
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [
    onCropRect,
    onCursorMove,
    onMoveSelectionBy,
    onResizePrimary,
    onRotatePrimary,
    onSelectMany,
    onSetCanvasPan,
    onSetGuides,
    onClearSelection,
    previewLayers,
    primaryLayer,
    scale
  ]);

  return (
    <section className="studio-canvas-shell">
      {project.canvas.showRulers && (
        <>
          <div className="studio-ruler horizontal">
            {Array.from({ length: Math.ceil(project.canvas.width / 100) + 1 }, (_, index) => (
              <span key={index} style={{ left: `${index * 100 * scale + project.canvas.panX}px` }}>{index * 100}</span>
            ))}
          </div>
          <div className="studio-ruler vertical">
            {Array.from({ length: Math.ceil(project.canvas.height / 100) + 1 }, (_, index) => (
              <span key={index} style={{ top: `${index * 100 * scale + project.canvas.panY}px` }}>{index * 100}</span>
            ))}
          </div>
        </>
      )}

      <div
        className={`studio-canvas-viewport theme-${theme}`}
        style={{ cursor: activeTool === 'hand' ? 'grab' : hoverCursor }}
        onWheel={(event) => {
          if (!event.ctrlKey && activeTool !== 'zoom') return;
          event.preventDefault();
          onSetCanvasZoom(project.canvas.zoom + (event.deltaY < 0 ? 0.08 : -0.08));
        }}
        onPointerDown={(event) => {
          const artboard = artboardRef.current;
          if (!artboard) return;
          const rect = artboard.getBoundingClientRect();
          const x = (event.clientX - rect.left) / scale;
          const y = (event.clientY - rect.top) / scale;
          onCursorMove({ x, y });

          if (activeTool === 'hand' || event.button === 1) {
            dragRef.current = { mode: 'pan', pointerX: event.clientX, pointerY: event.clientY, panX: project.canvas.panX, panY: project.canvas.panY };
            return;
          }

          if (activeTool === 'text') {
            onAddTextAt(x, y);
            return;
          }

          if (activeTool === 'rectangle' || activeTool === 'rounded-rectangle' || activeTool === 'ellipse' || activeTool === 'line' || activeTool === 'arrow' || activeTool === 'polygon') {
            onAddShapeAt(activeTool, x, y);
            return;
          }

          if (activeTool === 'marquee' || activeTool === 'crop' || activeTool === 'perspective-crop') {
            dragRef.current = {
              mode: activeTool === 'marquee' ? 'marquee' : 'crop',
              startX: x,
              startY: y,
              currentX: x,
              currentY: y
            };
            setMarqueeRect({ x, y, width: 0, height: 0 });
            return;
          }

          if (activeTool === 'lasso') {
            dragRef.current = { mode: 'lasso', points: [{ x, y }] };
            setLassoPoints([{ x, y }]);
            return;
          }

          if (activeTool === 'zoom') {
            onSetCanvasZoom(project.canvas.zoom + (event.shiftKey ? -0.2 : 0.2));
            return;
          }

          if (!premiumEnabled && (activeTool === 'magic-wand' || activeTool === 'clone' || activeTool === 'blur' || activeTool === 'dodge-burn' || activeTool === 'healing' || activeTool === 'red-eye' || activeTool === 'color-replace' || activeTool === 'pen' || activeTool === 'sharpen' || activeTool === 'smudge')) {
            onRequestPremiumTool(activeTool);
            return;
          }

          if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'fill' || activeTool === 'gradient' || activeTool === 'eyedropper' || activeTool === 'pen') {
            onApplyToolAt(activeTool, { x, y }, null);
            return;
          }

          if (event.target === event.currentTarget) {
            onClearSelection();
          }
        }}
        onMouseMove={(event) => {
          const artboard = artboardRef.current;
          if (!artboard) return;
          const rect = artboard.getBoundingClientRect();
          onCursorMove({ x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale });
        }}
      >
        <div
          ref={artboardRef}
          className="studio-artboard"
          style={{
            width: project.canvas.width,
            height: project.canvas.height,
            background: project.canvas.transparent ? 'transparent' : project.canvas.background,
            left: `calc(50% - ${(project.canvas.width / 2).toFixed(1)}px)`,
            top: `calc(50% - ${(project.canvas.height / 2).toFixed(1)}px)`,
            transform: `translate(${project.canvas.panX}px, ${project.canvas.panY}px) scale(${scale}) rotate(${project.canvas.rotation}deg)`
          }}
        >
          <div
            className="studio-artboard-checker"
            style={{
              backgroundImage: checkerboardStyle,
              backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
              backgroundSize: '24px 24px'
            }}
          />
          {project.canvas.showGrid && <div className="studio-grid-overlay" />}

          {previewLayers.map((layer) => {
            const selected = selectionIds.includes(layer.id);
            const style = effectStyle(layer);
            return (
              <div
                key={layer.id}
                className={`studio-layer-object ${selected ? 'is-selected' : ''} is-${layer.kind}`}
                style={{
                  left: 0,
                  top: 0,
                  width: layer.width,
                  height: layer.height,
                  ...style
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const artboard = artboardRef.current;
                  if (!artboard) return;
                  const rect = artboard.getBoundingClientRect();
                  const x = (event.clientX - rect.left) / scale;
                  const y = (event.clientY - rect.top) / scale;
                  if (layer.locked) return;

                  if (activeTool === 'magic-wand') {
                    const seedColor = layer.kind === 'shape' ? layer.fill : layer.kind === 'text' ? layer.color : null;
                    const ids = previewLayers
                      .filter((candidate) => candidate.kind === layer.kind)
                      .filter((candidate) => candidate.kind !== 'shape' || !seedColor || (candidate.kind === 'shape' && candidate.fill === seedColor))
                      .map((candidate) => candidate.id);
                    onSelectMany(ids);
                    return;
                  }

                  if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'fill' || activeTool === 'gradient' || activeTool === 'eyedropper' || activeTool === 'clone' || activeTool === 'blur' || activeTool === 'sharpen' || activeTool === 'smudge' || activeTool === 'dodge-burn' || activeTool === 'healing' || activeTool === 'red-eye' || activeTool === 'color-replace' || activeTool === 'pen') {
                    onSelectLayer(layer.id, event.shiftKey);
                    onApplyToolAt(activeTool, { x, y }, layer.id);
                    return;
                  }

                  onSelectLayer(layer.id, event.shiftKey);
                  if (activeTool === 'move' || activeTool === 'select' || activeTool === 'transform') {
                    dragRef.current = {
                      mode: 'move',
                      pointerX: event.clientX,
                      pointerY: event.clientY
                    };
                  }
                }}
                onMouseEnter={() => setHoverCursor(layer.locked ? 'not-allowed' : activeTool === 'zoom' ? 'zoom-in' : 'move')}
                onMouseLeave={() => setHoverCursor('default')}
              >
                {(layer.kind === 'image' || layer.kind === 'ai') && (
                  <img src={layer.src} alt={layer.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: layer.fit }} />
                )}
                {layer.kind === 'text' && (
                  <div
                    className="studio-text-layer"
                    style={{
                      width: '100%',
                      height: '100%',
                      color: layer.color,
                      fontFamily: layer.fontFamily,
                      fontSize: layer.fontSize,
                      fontWeight: layer.fontWeight,
                      fontStyle: layer.italic ? 'italic' : 'normal',
                      textDecoration: layer.underline ? 'underline' : 'none',
                      lineHeight: layer.lineHeight,
                      letterSpacing: `${layer.letterSpacing}px`,
                      textAlign: layer.align,
                      background: layer.gradientText ? `linear-gradient(135deg, ${layer.gradientStart || layer.color}, ${layer.gradientEnd || layer.color})` : undefined,
                      WebkitBackgroundClip: layer.gradientText ? 'text' : undefined,
                      WebkitTextFillColor: layer.gradientText ? 'transparent' : undefined,
                      textShadow: `${layer.shadowColor || '#09101c'} 0 10px ${layer.shadowBlur || 0}px, ${layer.glowColor || '#42e8ff'} 0 0 ${layer.glowStrength || 0}px`
                    }}
                  >
                    {layer.text}
                  </div>
                )}
                {layer.kind === 'shape' && shapeElement(layer)}
              </div>
            );
          })}

          {primaryLayer && (
            <div
              className="studio-selection-box"
              style={{
                transform: `translate(${primaryLayer.x}px, ${primaryLayer.y}px) rotate(${primaryLayer.rotation}deg)`,
                width: primaryLayer.width,
                height: primaryLayer.height
              }}
            >
              <button
                type="button"
                className="studio-rotate-handle"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  dragRef.current = {
                    mode: 'rotate',
                    centerX: primaryLayer.x + primaryLayer.width / 2,
                    centerY: primaryLayer.y + primaryLayer.height / 2,
                    startRotation: primaryLayer.rotation
                  };
                }}
              />
              {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  className={`studio-resize-handle is-${handle}`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    dragRef.current = {
                      mode: 'resize',
                      handle,
                      pointerX: event.clientX,
                      pointerY: event.clientY,
                      x: primaryLayer.x,
                      y: primaryLayer.y,
                      width: primaryLayer.width,
                      height: primaryLayer.height
                    };
                  }}
                />
              ))}
            </div>
          )}

          {marqueeRect && (
            <div
              className={`studio-marquee-box ${activeTool === 'crop' || activeTool === 'perspective-crop' ? 'is-crop' : ''}`}
              style={{
                left: marqueeRect.x,
                top: marqueeRect.y,
                width: marqueeRect.width,
                height: marqueeRect.height
              }}
            />
          )}

          {lassoPoints.length > 1 && (
            <svg className="studio-lasso-overlay" width={project.canvas.width} height={project.canvas.height}>
              <polyline
                points={lassoPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                fill="rgba(66,232,255,0.1)"
                stroke="rgba(66,232,255,0.9)"
                strokeWidth="2"
              />
            </svg>
          )}

          {project.canvas.showGuides && guides.map((guide, index) => (
            <div
              key={`${guide.type}-${index}`}
              className={`studio-guide is-${guide.type}`}
              style={guide.type === 'vertical' ? { left: guide.value } : { top: guide.value }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
