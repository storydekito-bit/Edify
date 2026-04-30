import { Bot, Grid2X2, Layers3, SlidersHorizontal, Sparkles, Wand2 } from 'lucide-react';
import type { StudioLayer, StudioPremiumFeature, StudioProject, StudioTextLayer } from '../../types/studio';

type StudioPropertiesPanelProps = {
  layer: StudioLayer | null;
  premiumEnabled: boolean;
  canvas: StudioProject['canvas'];
  activeColor: string;
  brushSettings: { size: number; hardness: number; opacity: number };
  onUpdateLayer: (layerId: string, updater: (layer: StudioLayer) => StudioLayer, commit?: boolean) => void;
  onRunAi: (action:
    | 'generative-fill'
    | 'generative-remove'
    | 'background-remover'
    | 'object-select'
    | 'subject-select'
    | 'smart-erase'
    | 'expand-canvas'
    | 'replace-background'
    | 'upscale'
    | 'face-enhance'
    | 'separate-layers',
    prompt: string) => void;
  onRequestPremium: (feature: StudioPremiumFeature, title: string) => void;
  onAlign: (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
  onAddAdjustmentLayer: () => void;
  onToggleMask: (layerId: string) => void;
  onApplyMask: (layerId: string) => void;
  onInvertMask: (layerId: string) => void;
  onToggleClipping: (layerId: string) => void;
  onConvertSmartObject: () => void;
  onAutoEnhance: () => void;
  onAutoColor: () => void;
  onAutoContrast: () => void;
  onApplyTextPreset: (preset: StudioTextLayer['stylePreset']) => void;
  onSetPrimaryColor: (color: string) => void;
  onSetActiveColor: (color: string) => void;
  onSetBrushSettings: (next: { size: number; hardness: number; opacity: number }) => void;
  onToggleGrid: () => void;
  onToggleGuides: () => void;
  onToggleRulers: () => void;
  onToggleSnap: () => void;
  onToggleTransparent: () => void;
  onSetCanvasBackground: (color: string) => void;
  onFitCanvas: () => void;
  onCanvas100: () => void;
  onRotateCanvas: (delta: number) => void;
};

const blendModes: StudioLayer['blendMode'][] = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'difference', 'darken', 'lighten'];
const textPresets: NonNullable<StudioTextLayer['stylePreset']>[] = ['apple-clean', 'netflix', 'roblox', 'neon', 'luxury', 'cyber', 'glass'];

export function StudioPropertiesPanel({
  layer,
  premiumEnabled,
  canvas,
  activeColor,
  brushSettings,
  onUpdateLayer,
  onRunAi,
  onRequestPremium,
  onAlign,
  onDistribute,
  onAddAdjustmentLayer,
  onToggleMask,
  onApplyMask,
  onInvertMask,
  onToggleClipping,
  onConvertSmartObject,
  onAutoEnhance,
  onAutoColor,
  onAutoContrast,
  onApplyTextPreset,
  onSetPrimaryColor,
  onSetActiveColor,
  onSetBrushSettings,
  onToggleGrid,
  onToggleGuides,
  onToggleRulers,
  onToggleSnap,
  onToggleTransparent,
  onSetCanvasBackground,
  onFitCanvas,
  onCanvas100,
  onRotateCanvas
}: StudioPropertiesPanelProps) {
  if (!layer) {
    return (
      <section className="studio-properties-panel">
        <div className="studio-panel-header">
          <strong><SlidersHorizontal size={15} /> Canvas</strong>
          <small>No selection</small>
        </div>
        <div className="studio-prop-section">
          <strong><Grid2X2 size={14} /> Workspace</strong>
          <div className="studio-action-grid">
            <button className="secondary-button" type="button" onClick={onFitCanvas}>Fit view</button>
            <button className="secondary-button" type="button" onClick={onCanvas100}>100%</button>
            <button className="secondary-button" type="button" onClick={onToggleGrid}>{canvas.showGrid ? 'Hide grid' : 'Show grid'}</button>
            <button className="secondary-button" type="button" onClick={onToggleGuides}>{canvas.showGuides ? 'Hide guides' : 'Show guides'}</button>
            <button className="secondary-button" type="button" onClick={onToggleRulers}>{canvas.showRulers ? 'Hide rulers' : 'Show rulers'}</button>
            <button className="secondary-button" type="button" onClick={onToggleSnap}>{canvas.snap ? 'Snap on' : 'Snap off'}</button>
            <button className="secondary-button" type="button" onClick={() => onRotateCanvas(-15)}>Rotate -15°</button>
            <button className="secondary-button" type="button" onClick={() => onRotateCanvas(15)}>Rotate +15°</button>
          </div>
          <label>
            <span>Background</span>
            <input type="color" value={canvas.background} onChange={(event) => onSetCanvasBackground(event.target.value)} />
          </label>
          <label className="studio-checkbox">
            <input type="checkbox" checked={canvas.transparent} onChange={onToggleTransparent} />
            <span>Transparent background</span>
          </label>
        </div>
        <div className="studio-prop-section">
          <strong><Layers3 size={14} /> Defaults</strong>
          <label>
            <span>Active color</span>
            <input type="color" value={activeColor} onChange={(event) => onSetActiveColor(event.target.value)} />
          </label>
          <div className="studio-prop-grid">
            <label><span>Brush size</span><input type="range" min={4} max={220} value={brushSettings.size} onChange={(event) => onSetBrushSettings({ ...brushSettings, size: Number(event.target.value) })} /></label>
            <label><span>Hardness</span><input type="range" min={0} max={100} value={brushSettings.hardness} onChange={(event) => onSetBrushSettings({ ...brushSettings, hardness: Number(event.target.value) })} /></label>
            <label><span>Brush opacity</span><input type="range" min={0.1} max={1} step={0.05} value={brushSettings.opacity} onChange={(event) => onSetBrushSettings({ ...brushSettings, opacity: Number(event.target.value) })} /></label>
          </div>
        </div>
        <div className="studio-prop-section">
          <strong><Sparkles size={14} /> Quick actions</strong>
          <div className="studio-action-grid">
            <button className="secondary-button" type="button" onClick={onAddAdjustmentLayer}>Adjustment layer</button>
            <button className="secondary-button" type="button" onClick={onAutoEnhance}>Auto enhance</button>
            <button className="secondary-button" type="button" onClick={onAutoColor}>Auto color</button>
            <button className="secondary-button" type="button" onClick={onAutoContrast}>Auto contrast</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="studio-properties-panel">
      <div className="studio-panel-header">
        <strong><SlidersHorizontal size={15} /> Properties</strong>
        <small>{layer.kind}</small>
      </div>

      <div className="studio-prop-section">
        <label>
          <span>Name</span>
          <input value={layer.name} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, name: event.target.value }), false)} onBlur={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, name: event.target.value }), true)} />
        </label>
        <div className="studio-prop-grid">
          <label><span>X</span><input type="range" min={-canvas.width} max={canvas.width} value={layer.x} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, x: Number(event.target.value) }), false)} /></label>
          <label><span>Y</span><input type="range" min={-canvas.height} max={canvas.height} value={layer.y} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, y: Number(event.target.value) }), false)} /></label>
          <label><span>Width</span><input type="range" min={24} max={canvas.width * 1.5} value={layer.width} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, width: Number(event.target.value) }), false)} /></label>
          <label><span>Height</span><input type="range" min={24} max={canvas.height * 1.5} value={layer.height} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, height: Number(event.target.value) }), false)} /></label>
          <label><span>Rotation</span><input type="range" min={-180} max={180} value={layer.rotation} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, rotation: Number(event.target.value) }), false)} /></label>
          <label><span>Opacity</span><input type="range" min={0} max={1} step={0.01} value={layer.opacity} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, opacity: Number(event.target.value) }), false)} /></label>
        </div>
        <label>
          <span>Blend mode</span>
          <select value={layer.blendMode} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, blendMode: event.target.value as StudioLayer['blendMode'] }), true)}>
            {blendModes.map((blendMode) => (
              <option key={blendMode} value={blendMode}>{blendMode}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="studio-prop-section">
        <strong><Layers3 size={14} /> Layer actions</strong>
        <div className="studio-action-grid">
          <button className="secondary-button" type="button" onClick={() => onToggleMask(layer.id)}>{layer.maskEnabled ? 'Disable mask' : 'Enable mask'}</button>
          <button className="secondary-button" type="button" onClick={() => onApplyMask(layer.id)}>Apply mask</button>
          <button className="secondary-button" type="button" onClick={() => onInvertMask(layer.id)}>Invert mask</button>
          <button className="secondary-button" type="button" onClick={() => onToggleClipping(layer.id)}>{layer.clippingMask ? 'Unclip layer' : 'Clip to below'}</button>
          <button className="secondary-button" type="button" onClick={onConvertSmartObject}>{layer.smartObject ? 'Disable smart object' : 'Convert to smart object'}</button>
          <button className="secondary-button" type="button" onClick={onAddAdjustmentLayer}>Adjustment layer</button>
        </div>
      </div>

      {layer.kind === 'text' && (
        <div className="studio-prop-section">
          <strong>Text</strong>
          <label>
            <span>Content</span>
            <textarea value={layer.text} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, text: event.target.value }), false)} />
          </label>
          <div className="studio-prop-grid">
            <label><span>Text color</span><input type="color" value={layer.color} onChange={(event) => onSetPrimaryColor(event.target.value)} /></label>
            <label><span>Gradient text</span><input type="checkbox" checked={Boolean(layer.gradientText)} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, gradientText: event.target.checked }), false)} /></label>
            <label><span>Font size</span><input type="range" min={12} max={180} value={layer.fontSize} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, fontSize: Number(event.target.value) }), false)} /></label>
            <label><span>Weight</span><input type="range" min={100} max={900} step={100} value={layer.fontWeight} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, fontWeight: Number(event.target.value) }), false)} /></label>
            <label><span>Letter spacing</span><input type="range" min={-4} max={20} step={0.5} value={layer.letterSpacing} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, letterSpacing: Number(event.target.value) }), false)} /></label>
            <label><span>Line height</span><input type="range" min={0.8} max={2.2} step={0.05} value={layer.lineHeight} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, lineHeight: Number(event.target.value) }), false)} /></label>
            <label><span>Stroke</span><input type="range" min={0} max={16} value={layer.strokeWidth ?? 0} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, strokeWidth: Number(event.target.value) }), false)} /></label>
            <label><span>Glow</span><input type="range" min={0} max={48} value={layer.glowStrength ?? 0} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, glowStrength: Number(event.target.value) }), false)} /></label>
            <label><span>Curve</span><input type="range" min={-100} max={100} value={layer.curvedText ?? 0} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, curvedText: Number(event.target.value) }), false)} /></label>
            <label><span>Italic</span><input type="checkbox" checked={layer.italic} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, italic: event.target.checked }), false)} /></label>
            <label><span>Underline</span><input type="checkbox" checked={layer.underline} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, underline: event.target.checked }), false)} /></label>
          </div>
          <label>
            <span>Text preset</span>
            <select value={layer.stylePreset ?? 'apple-clean'} onChange={(event) => onApplyTextPreset(event.target.value as StudioTextLayer['stylePreset'])}>
              {textPresets.map((preset) => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {layer.kind === 'shape' && (
        <div className="studio-prop-section">
          <strong>Shape</strong>
          <div className="studio-prop-grid">
            <label><span>Fill</span><input type="color" value={layer.fill} onChange={(event) => onSetPrimaryColor(event.target.value)} /></label>
            <label><span>Stroke</span><input type="color" value={layer.strokeColor} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, strokeColor: event.target.value }), false)} /></label>
            <label><span>Stroke width</span><input type="range" min={0} max={24} value={layer.strokeWidth} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, strokeWidth: Number(event.target.value) }), false)} /></label>
            {typeof layer.radius === 'number' && <label><span>Radius</span><input type="range" min={0} max={120} value={layer.radius} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, radius: Number(event.target.value) }), false)} /></label>}
          </div>
        </div>
      )}

      {(layer.kind === 'image' || layer.kind === 'ai' || layer.kind === 'adjustment') && (
        <div className="studio-prop-section">
          <strong>Adjustments</strong>
          <div className="studio-prop-grid">
            <label><span>Brightness</span><input type="range" min={-100} max={100} value={layer.adjustments.brightness} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, brightness: Number(event.target.value) } }), false)} /></label>
            <label><span>Contrast</span><input type="range" min={-100} max={100} value={layer.adjustments.contrast} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, contrast: Number(event.target.value) } }), false)} /></label>
            <label><span>Exposure</span><input type="range" min={-100} max={100} value={layer.adjustments.exposure} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, exposure: Number(event.target.value) } }), false)} /></label>
            <label><span>Saturation</span><input type="range" min={-100} max={100} value={layer.adjustments.saturation} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, saturation: Number(event.target.value) } }), false)} /></label>
            <label><span>Vibrance</span><input type="range" min={-100} max={100} value={layer.adjustments.vibrance} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, vibrance: Number(event.target.value) } }), false)} /></label>
            <label><span>Hue</span><input type="range" min={-180} max={180} value={layer.adjustments.hue} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, hue: Number(event.target.value) } }), false)} /></label>
            <label><span>Temperature</span><input type="range" min={-100} max={100} value={layer.adjustments.temperature} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, temperature: Number(event.target.value) } }), false)} /></label>
            <label><span>Tint</span><input type="range" min={-100} max={100} value={layer.adjustments.tint} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, tint: Number(event.target.value) } }), false)} /></label>
            <label><span>Shadows</span><input type="range" min={-100} max={100} value={layer.adjustments.shadows} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, shadows: Number(event.target.value) } }), false)} /></label>
            <label><span>Highlights</span><input type="range" min={-100} max={100} value={layer.adjustments.highlights} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, highlights: Number(event.target.value) } }), false)} /></label>
            <label><span>Curves lift</span><input type="range" min={-100} max={100} value={layer.adjustments.curvesLift} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, curvesLift: Number(event.target.value) } }), false)} /></label>
            <label><span>Levels gamma</span><input type="range" min={0.2} max={2.4} step={0.05} value={layer.adjustments.levelsGamma} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, levelsGamma: Number(event.target.value) } }), false)} /></label>
          </div>
          <div className="studio-action-grid">
            <button className="secondary-button" type="button" onClick={onAutoEnhance}>Auto enhance</button>
            <button className="secondary-button" type="button" onClick={onAutoColor}>Auto color</button>
            <button className="secondary-button" type="button" onClick={onAutoContrast}>Auto contrast</button>
            <button className="secondary-button" type="button" onClick={() => onUpdateLayer(layer.id, (item) => ({ ...item, adjustments: { ...item.adjustments, invert: item.adjustments.invert ? 0 : 100 } }), true)}>Invert</button>
          </div>
        </div>
      )}

      <div className="studio-prop-section">
        <strong><Sparkles size={14} /> Filters</strong>
        <div className="studio-prop-grid">
          <label><span>Glow</span><input type="range" min={0} max={48} value={layer.filters.glow} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, glow: Number(event.target.value) } }), false)} /></label>
          <label><span>Gaussian blur</span><input type="range" min={0} max={30} value={layer.filters.gaussianBlur} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, gaussianBlur: Number(event.target.value) } }), false)} /></label>
          <label><span>Motion blur</span><input type="range" min={0} max={40} value={layer.filters.motionBlur} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, motionBlur: Number(event.target.value) } }), false)} /></label>
          <label><span>Noise</span><input type="range" min={0} max={100} value={layer.filters.noise} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, noise: Number(event.target.value) } }), false)} /></label>
          <label><span>Sharpen</span><input type="range" min={0} max={100} value={layer.filters.sharpen} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, sharpen: Number(event.target.value) } }), false)} /></label>
          <label><span>Vintage</span><input type="range" min={0} max={100} value={layer.filters.vintage} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, vintage: Number(event.target.value) } }), false)} /></label>
          <label><span>Cinematic</span><input type="range" min={0} max={100} value={layer.filters.cinematic} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, cinematic: Number(event.target.value) } }), false)} /></label>
          <label><span>Roblox glow</span><input type="range" min={0} max={100} value={layer.filters.robloxGlow} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, robloxGlow: Number(event.target.value) } }), false)} /></label>
          <label><span>YouTube enhance</span><input type="range" min={0} max={100} value={layer.filters.youtubeEnhance} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, youtubeEnhance: Number(event.target.value) } }), false)} /></label>
          <label><span>Stroke</span><input type="range" min={0} max={24} value={layer.filters.stroke} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, stroke: Number(event.target.value) } }), false)} /></label>
          <label><span>Bevel</span><input type="range" min={0} max={32} value={layer.filters.bevel} onChange={(event) => onUpdateLayer(layer.id, (item) => ({ ...item, filters: { ...item.filters, bevel: Number(event.target.value) } }), false)} /></label>
        </div>
      </div>

      <div className="studio-prop-section">
        <strong>Align and distribute</strong>
        <div className="studio-action-grid">
          <button className="secondary-button" type="button" onClick={() => onAlign('left')}>Left</button>
          <button className="secondary-button" type="button" onClick={() => onAlign('center')}>Center</button>
          <button className="secondary-button" type="button" onClick={() => onAlign('right')}>Right</button>
          <button className="secondary-button" type="button" onClick={() => onAlign('top')}>Top</button>
          <button className="secondary-button" type="button" onClick={() => onAlign('middle')}>Middle</button>
          <button className="secondary-button" type="button" onClick={() => onAlign('bottom')}>Bottom</button>
          <button className="secondary-button" type="button" onClick={() => onDistribute('horizontal')}>Distribute X</button>
          <button className="secondary-button" type="button" onClick={() => onDistribute('vertical')}>Distribute Y</button>
        </div>
      </div>

      <div className="studio-prop-section">
        <strong><Bot size={14} /> AI tools</strong>
        <div className="studio-ai-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => premiumEnabled ? onRunAi('generative-fill', 'Add a premium creator layer with a stronger visual hook.') : onRequestPremium('ai-tools', 'Generative Fill')}
          >
            Generative fill
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => premiumEnabled ? onRunAi('background-remover', 'Remove the background and return a clean cutout layer.') : onRequestPremium('ai-tools', 'Background Remover')}
          >
            Background remover
          </button>
          <button type="button" className="secondary-button" onClick={() => onRunAi('subject-select', 'Find the subject and prepare a clean editable layer result.')}>Subject selection</button>
          <button type="button" className="secondary-button" onClick={() => onRunAi('upscale', 'Upscale this image for a higher resolution export layer.')}>Upscale</button>
          <button type="button" className="secondary-button" onClick={() => onRunAi('face-enhance', 'Enhance the face and sharpen the thumbnail focus.')}>Face enhance</button>
          <button type="button" className="secondary-button" onClick={() => onRunAi('replace-background', 'Replace the background with a cleaner cinematic setup.')}>Replace background</button>
        </div>
      </div>
    </section>
  );
}
