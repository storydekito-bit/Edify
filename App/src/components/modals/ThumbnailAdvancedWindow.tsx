import {
  ArrowDown,
  ArrowUp,
  Brush,
  Download,
  ImageIcon,
  Layers3,
  Move,
  Plus,
  Sparkles,
  Type,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { edifyApi } from '../../lib/bridge';
import type { MediaAsset, ProjectDocument } from '../../types/edify';

type ThumbRatio = '16:9' | '1:1' | '4:5';

type GradientLayer = {
  id: string;
  kind: 'gradient';
  name: string;
  visible: boolean;
  opacity: number;
  start: string;
  end: string;
  angle: number;
};

type ImageLayer = {
  id: string;
  kind: 'image';
  name: string;
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
};

type TextLayer = {
  id: string;
  kind: 'text';
  name: string;
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontWeight: number;
};

type AdvancedLayer = GradientLayer | ImageLayer | TextLayer;

const ratioMeta: Record<ThumbRatio, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 }
};

const gradientPresets = [
  { start: '#05060a', end: '#314b9c' },
  { start: '#0f0a12', end: '#7b1740' },
  { start: '#14100a', end: '#7f5a20' },
  { start: '#0a1527', end: '#2c8cff' }
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function defaultLayers(project: ProjectDocument, selectedImage?: string): AdvancedLayer[] {
  return [
    {
      id: createId('gradient'),
      kind: 'gradient',
      name: 'Background gradient',
      visible: true,
      opacity: 1,
      start: '#05060a',
      end: '#3048a8',
      angle: 135
    },
    ...(selectedImage ? [{
      id: createId('image'),
      kind: 'image' as const,
      name: 'Hero image',
      visible: true,
      opacity: 1,
      x: 140,
      y: 100,
      width: 860,
      height: 480,
      src: selectedImage
    }] : []),
    {
      id: createId('text'),
      kind: 'text',
      name: 'Headline',
      visible: true,
      opacity: 1,
      x: 92,
      y: 538,
      text: project.name.toUpperCase(),
      color: '#f5fbff',
      fontSize: 82,
      fontWeight: 900
    },
    {
      id: createId('text'),
      kind: 'text',
      name: 'Subtitle',
      visible: true,
      opacity: 0.94,
      x: 98,
      y: 634,
      text: 'NEW VIDEO OUT NOW',
      color: '#d7e5ff',
      fontSize: 30,
      fontWeight: 700
    }
  ];
}

export function ThumbnailAdvancedWindow() {
  const [project, setProject] = useState<ProjectDocument | null>(null);
  const [ratio, setRatio] = useState<ThumbRatio>('16:9');
  const [layers, setLayers] = useState<AdvancedLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; layerId: string; x: number; y: number } | null>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    void edifyApi.getThumbnailAdvancedProject().then((document) => {
      if (!document) return;
      setProject(document);
      const firstImage = document.assets.find((asset) => asset.kind === 'image' && asset.previewUrl)?.previewUrl;
      const initial = defaultLayers(document, firstImage);
      setLayers(initial);
      setSelectedLayerId(initial[initial.length - 1]?.id ?? '');
    });
  }, []);

  const imageAssets = useMemo(
    () => (project?.assets ?? []).filter((asset) => asset.kind === 'image' && asset.previewUrl),
    [project]
  );

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const ratioInfo = ratioMeta[ratio];

  useEffect(() => {
    const imageLayers = layers.filter((layer): layer is ImageLayer => layer.kind === 'image');
    imageLayers.forEach((layer) => {
      if (imageCacheRef.current[layer.id]) return;
      const image = new Image();
      image.onload = () => forceRefresh((count) => count + 1);
      image.src = layer.src;
      imageCacheRef.current[layer.id] = image;
    });
  }, [layers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = ratioInfo.width;
    canvas.height = ratioInfo.height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    layers.forEach((layer) => {
      if (!layer.visible || layer.opacity <= 0) return;
      context.save();
      context.globalAlpha = layer.opacity;

      if (layer.kind === 'gradient') {
        const radians = (layer.angle * Math.PI) / 180;
        const x2 = canvas.width * Math.cos(radians);
        const y2 = canvas.height * Math.sin(radians);
        const gradient = context.createLinearGradient(0, 0, x2, y2);
        gradient.addColorStop(0, layer.start);
        gradient.addColorStop(1, layer.end);
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (layer.kind === 'image') {
        const image = imageCacheRef.current[layer.id];
        if (image) {
          context.drawImage(image, layer.x, layer.y, layer.width, layer.height);
        }
      }

      if (layer.kind === 'text') {
        context.fillStyle = layer.color;
        context.font = `${layer.fontWeight} ${layer.fontSize}px Inter, Segoe UI, sans-serif`;
        context.textBaseline = 'top';
        context.shadowColor = 'rgba(66, 232, 255, 0.35)';
        context.shadowBlur = layer.name === 'Headline' ? 24 : 0;
        context.fillText(layer.text, layer.x, layer.y);
      }

      context.restore();
    });

    context.strokeStyle = 'rgba(255,255,255,0.06)';
    context.strokeRect(0, 0, canvas.width, canvas.height);
  }, [layers, ratioInfo]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current || !stageRef.current || !canvasRef.current) return;
      const dragState = dragRef.current;
      const layer = layers.find((item) => item.id === dragState.layerId);
      if (!layer || (layer.kind !== 'image' && layer.kind !== 'text')) return;
      const rect = stageRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / Math.max(1, rect.width);
      const scaleY = canvasRef.current.height / Math.max(1, rect.height);
      const deltaX = (event.clientX - dragState.startX) * scaleX;
      const deltaY = (event.clientY - dragState.startY) * scaleY;
      setLayers((current) => current.map((item) => {
        if (item.id !== layer.id) return item;
        if (item.kind === 'image') {
          return {
            ...item,
            x: clamp(dragState.x + deltaX, -item.width * 0.4, canvasRef.current!.width - 40),
            y: clamp(dragState.y + deltaY, -item.height * 0.4, canvasRef.current!.height - 40)
          };
        }
        return {
          ...item,
          x: clamp(dragState.x + deltaX, 0, canvasRef.current!.width - 40),
          y: clamp(dragState.y + deltaY, 0, canvasRef.current!.height - 40)
        };
      }));
    };

    const onPointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [layers]);

  const updateLayer = (layerId: string, updater: (layer: AdvancedLayer) => AdvancedLayer) => {
    setLayers((current) => current.map((layer) => (layer.id === layerId ? updater(layer) : layer)));
  };

  const addTextLayer = () => {
    const next: TextLayer = {
      id: createId('text'),
      kind: 'text',
      name: 'Text layer',
      visible: true,
      opacity: 1,
      x: 120,
      y: 120,
      text: 'TYPE HERE',
      color: '#ffffff',
      fontSize: 58,
      fontWeight: 800
    };
    setLayers((current) => [...current, next]);
    setSelectedLayerId(next.id);
  };

  const addGradientLayer = () => {
    const preset = gradientPresets[(layers.length + 1) % gradientPresets.length];
    const next: GradientLayer = {
      id: createId('gradient'),
      kind: 'gradient',
      name: 'Gradient overlay',
      visible: true,
      opacity: 0.7,
      start: preset.start,
      end: preset.end,
      angle: 135
    };
    setLayers((current) => [...current, next]);
    setSelectedLayerId(next.id);
  };

  const addProjectImageLayer = (asset: MediaAsset) => {
    if (!asset.previewUrl) return;
    const next: ImageLayer = {
      id: createId('image'),
      kind: 'image',
      name: asset.name,
      visible: true,
      opacity: 1,
      x: 110,
      y: 90,
      width: 820,
      height: 460,
      src: asset.previewUrl
    };
    setLayers((current) => [...current, next]);
    setSelectedLayerId(next.id);
  };

  const addFirstProjectImage = () => {
    if (imageAssets[0]) {
      addProjectImageLayer(imageAssets[0]);
    }
  };

  const deleteLayer = () => {
    if (!selectedLayerId) return;
    setLayers((current) => {
      const next = current.filter((layer) => layer.id !== selectedLayerId);
      setSelectedLayerId(next[next.length - 1]?.id ?? '');
      return next;
    });
  };

  const moveLayer = (direction: -1 | 1) => {
    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === selectedLayerId);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const duplicateLayer = () => {
    if (!selectedLayer) return;
    const next = { ...selectedLayer, id: createId(selectedLayer.kind), name: `${selectedLayer.name} copy` } as AdvancedLayer;
    if ('x' in next) {
      next.x += 36;
      next.y += 36;
    }
    setLayers((current) => [...current, next]);
    setSelectedLayerId(next.id);
  };

  const centerSelectedLayer = () => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, (layer) => {
      if (layer.kind === 'image') {
        return {
          ...layer,
          x: (ratioInfo.width - layer.width) / 2,
          y: (ratioInfo.height - layer.height) / 2
        };
      }
      if (layer.kind === 'text') {
        return {
          ...layer,
          x: ratioInfo.width * 0.18,
          y: ratioInfo.height * 0.24
        };
      }
      return layer;
    });
  };

  const toggleSelectedVisibility = () => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, (layer) => ({ ...layer, visible: !layer.visible }));
  };

  const cycleRatio = () => {
    const order: ThumbRatio[] = ['16:9', '1:1', '4:5'];
    const next = order[(order.indexOf(ratio) + 1) % order.length];
    setRatio(next);
  };

  const selectNextLayer = () => {
    if (layers.length === 0) return;
    const index = layers.findIndex((layer) => layer.id === selectedLayerId);
    const next = layers[(index + 1 + layers.length) % layers.length];
    setSelectedLayerId(next.id);
  };

  const applyQuickFilter = () => {
    if (selectedLayer?.kind === 'gradient') {
      const currentIndex = gradientPresets.findIndex((preset) => preset.start === selectedLayer.start && preset.end === selectedLayer.end);
      const nextPreset = gradientPresets[(currentIndex + 1 + gradientPresets.length) % gradientPresets.length];
      updateLayer(selectedLayer.id, (layer) => ({ ...layer as GradientLayer, start: nextPreset.start, end: nextPreset.end }));
      return;
    }
    if (selectedLayer?.kind === 'image') {
      updateLayer(selectedLayer.id, (layer) => ({ ...layer as ImageLayer, opacity: clamp(layer.opacity - 0.08, 0.25, 1) }));
    }
  };

  const exportPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    setIsExporting(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Edify could not create the PNG preview.');
      const buffer = await blob.arrayBuffer();
      await edifyApi.saveThumbnailPng({ fileName: `${project.name} Advanced Thumbnail.png`, buffer });
    } finally {
      setIsExporting(false);
    }
  };

  if (!project) {
    return (
      <div className="thumbnail-advanced-window loading">
        <div className="thumbnail-advanced-empty">Loading Thumbnail Pro workspace…</div>
      </div>
    );
  }

  return (
    <div className="thumbnail-advanced-window">
      <header className="thumbnail-advanced-appbar">
        <div className="thumbnail-advanced-left">
          <strong>Thumbnail Pro Advanced</strong>
          <span>{project.name}</span>
        </div>
        <div className="thumbnail-advanced-center">
          <button type="button" onClick={() => fileInputRef.current?.click()}>File</button>
          <button type="button" onClick={addTextLayer}>Edit</button>
          <button type="button" onClick={addFirstProjectImage}>Image</button>
          <button type="button" onClick={addGradientLayer}>Layer</button>
          <button type="button" onClick={selectNextLayer}>Select</button>
          <button type="button" onClick={applyQuickFilter}>Filter</button>
          <button type="button" onClick={cycleRatio}>View</button>
          <button type="button" onClick={() => void edifyApi.closeCurrentWindow()}>Window</button>
        </div>
        <div className="thumbnail-advanced-right">
          <button type="button" onClick={exportPng} disabled={isExporting}><Download size={15} /> {isExporting ? 'Exporting…' : 'Export PNG'}</button>
          <button type="button" onClick={() => void edifyApi.closeCurrentWindow()}><X size={15} /> Close</button>
        </div>
      </header>

      <div className="thumbnail-advanced-toolbar">
        <button type="button" onClick={addTextLayer}><Type size={15} /> Add text</button>
        <button type="button" onClick={addGradientLayer}><Sparkles size={15} /> Add gradient</button>
        <button type="button" onClick={() => fileInputRef.current?.click()}><ImageIcon size={15} /> Import image</button>
        <div className="thumbnail-advanced-ratios">
          {(['16:9', '1:1', '4:5'] as ThumbRatio[]).map((item) => (
            <button key={item} type="button" className={ratio === item ? 'active' : ''} onClick={() => setRatio(item)}>{item}</button>
          ))}
        </div>
      </div>

      <div className="thumbnail-advanced-layout">
        <aside className="thumbnail-advanced-sidebar">
          <section>
            <header><Brush size={14} /> Project images</header>
            <div className="thumbnail-advanced-asset-list">
              {imageAssets.map((asset) => (
                <button key={asset.id} type="button" onClick={() => addProjectImageLayer(asset)}>
                  <strong>{asset.name}</strong>
                  <small>Add as layer</small>
                </button>
              ))}
            </div>
          </section>

          <section>
            <header><Move size={14} /> Tools</header>
            <div className="thumbnail-advanced-tool-grid">
              <button type="button" onClick={centerSelectedLayer}><Move size={14} /> Center layer</button>
              <button type="button" onClick={addTextLayer}><Type size={14} /> Add text</button>
              <button type="button" onClick={() => fileInputRef.current?.click()}><ImageIcon size={14} /> Import image</button>
              <button type="button" onClick={addGradientLayer}><Sparkles size={14} /> Add gradient</button>
              <button type="button" onClick={duplicateLayer}><Plus size={14} /> Duplicate</button>
              <button type="button" onClick={toggleSelectedVisibility}><X size={14} /> Toggle visible</button>
            </div>
          </section>
        </aside>

        <main className="thumbnail-advanced-stage-wrap">
          <div
            ref={stageRef}
            className={`thumbnail-advanced-stage ratio-${ratio.replace(':', '-')}`}
            onPointerDown={(event) => {
              if (!selectedLayer || (selectedLayer.kind !== 'image' && selectedLayer.kind !== 'text')) return;
              dragRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                layerId: selectedLayer.id,
                x: selectedLayer.x,
                y: selectedLayer.y
              };
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </main>

        <aside className="thumbnail-advanced-panels">
          <section>
            <header><Layers3 size={14} /> Layers</header>
            <div className="thumbnail-advanced-layer-stack">
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  className={selectedLayerId === layer.id ? 'active' : ''}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <strong>{layer.name}</strong>
                  <small>{layer.kind} · {layer.visible ? 'visible' : 'hidden'}</small>
                </button>
              ))}
            </div>
            <div className="thumbnail-advanced-layer-actions">
              <button type="button" onClick={() => moveLayer(-1)}><ArrowUp size={14} /> Up</button>
              <button type="button" onClick={() => moveLayer(1)}><ArrowDown size={14} /> Down</button>
              <button type="button" onClick={deleteLayer}><X size={14} /> Delete</button>
            </div>
          </section>

          {selectedLayer && (
            <section>
              <header><Plus size={14} /> Properties</header>
              <div className="thumbnail-advanced-properties">
                {'x' in selectedLayer && (
                  <>
                    <label><span>X</span><input type="range" min="-200" max={ratioInfo.width} value={selectedLayer.x} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as ImageLayer | TextLayer, x: Number(event.target.value) }))} /></label>
                    <label><span>Y</span><input type="range" min="-200" max={ratioInfo.height} value={selectedLayer.y} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as ImageLayer | TextLayer, y: Number(event.target.value) }))} /></label>
                  </>
                )}
                <label><span>Opacity</span><input type="range" min="0" max="1" step="0.01" value={selectedLayer.opacity} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer, opacity: Number(event.target.value) }))} /></label>

                {selectedLayer.kind === 'gradient' && (
                  <>
                    <label><span>Start</span><input type="color" value={selectedLayer.start} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as GradientLayer, start: event.target.value }))} /></label>
                    <label><span>End</span><input type="color" value={selectedLayer.end} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as GradientLayer, end: event.target.value }))} /></label>
                    <label><span>Angle</span><input type="range" min="0" max="360" value={selectedLayer.angle} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as GradientLayer, angle: Number(event.target.value) }))} /></label>
                  </>
                )}

                {selectedLayer.kind === 'image' && (
                  <>
                    <label><span>Width</span><input type="range" min="80" max={ratioInfo.width * 1.4} value={selectedLayer.width} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as ImageLayer, width: Number(event.target.value) }))} /></label>
                    <label><span>Height</span><input type="range" min="80" max={ratioInfo.height * 1.4} value={selectedLayer.height} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as ImageLayer, height: Number(event.target.value) }))} /></label>
                  </>
                )}

                {selectedLayer.kind === 'text' && (
                  <>
                    <label className="full"><span>Text</span><textarea value={selectedLayer.text} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as TextLayer, text: event.target.value }))} /></label>
                    <label><span>Color</span><input type="color" value={selectedLayer.color} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as TextLayer, color: event.target.value }))} /></label>
                    <label><span>Font size</span><input type="range" min="18" max="160" value={selectedLayer.fontSize} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as TextLayer, fontSize: Number(event.target.value) }))} /></label>
                    <label><span>Weight</span><input type="range" min="400" max="900" step="100" value={selectedLayer.fontWeight} onChange={(event) => updateLayer(selectedLayer.id, (layer) => ({ ...layer as TextLayer, fontWeight: Number(event.target.value) }))} /></label>
                  </>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const src = URL.createObjectURL(file);
          const next: ImageLayer = {
            id: createId('image'),
            kind: 'image',
            name: file.name,
            visible: true,
            opacity: 1,
            x: 120,
            y: 100,
            width: 840,
            height: 460,
            src
          };
          setLayers((current) => [...current, next]);
          setSelectedLayerId(next.id);
        }}
      />
    </div>
  );
}
