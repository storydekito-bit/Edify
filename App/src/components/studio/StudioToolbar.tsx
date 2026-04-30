import {
  Brush,
  Circle,
  Copy,
  Crop,
  Droplets,
  Eraser,
  Hand,
  HeartPulse,
  ImagePlus,
  Lasso,
  MousePointer2,
  Move,
  PaintBucket,
  PenTool,
  Pipette,
  RotateCcw,
  RectangleHorizontal,
  Sparkles,
  SquareDashedMousePointer,
  StretchHorizontal,
  Type,
  Wand2,
  ZoomIn
} from 'lucide-react';
import type { StudioPremiumFeature, StudioToolId } from '../../types/studio';

type StudioToolbarProps = {
  activeTool: StudioToolId;
  premiumEnabled: boolean;
  onToolSelect: (tool: StudioToolId) => void;
  onRequestPremium: (feature: StudioPremiumFeature, title: string) => void;
};

const toolGroups: Array<Array<{ id: StudioToolId; label: string; icon: typeof Move; premium?: StudioPremiumFeature }>> = [
  [
    { id: 'move', label: 'Move', icon: Move },
    { id: 'select', label: 'Select', icon: MousePointer2 },
    { id: 'transform', label: 'Transform', icon: StretchHorizontal },
    { id: 'marquee', label: 'Rectangle Select', icon: SquareDashedMousePointer },
    { id: 'lasso', label: 'Lasso', icon: Lasso },
    { id: 'magic-wand', label: 'Magic Wand', icon: Wand2, premium: 'ai-tools' }
  ],
  [
    { id: 'crop', label: 'Crop', icon: Crop },
    { id: 'perspective-crop', label: 'Perspective Crop', icon: RotateCcw },
    { id: 'brush', label: 'Brush', icon: Brush },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'fill', label: 'Fill Bucket', icon: PaintBucket },
    { id: 'gradient', label: 'Gradient', icon: Sparkles }
  ],
  [
    { id: 'text', label: 'Text', icon: Type },
    { id: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal },
    { id: 'ellipse', label: 'Circle', icon: Circle },
    { id: 'pen', label: 'Pen Tool', icon: PenTool, premium: 'advanced-layers' },
    { id: 'eyedropper', label: 'Eyedropper', icon: Pipette },
    { id: 'clone', label: 'Clone', icon: ImagePlus, premium: 'advanced-layers' }
  ],
  [
    { id: 'blur', label: 'Blur', icon: Droplets, premium: 'premium-filters' },
    { id: 'sharpen', label: 'Sharpen', icon: Sparkles, premium: 'premium-filters' },
    { id: 'smudge', label: 'Smudge', icon: Copy, premium: 'premium-filters' },
    { id: 'healing', label: 'Healing', icon: HeartPulse, premium: 'premium-filters' },
    { id: 'red-eye', label: 'Red Eye', icon: HeartPulse, premium: 'premium-filters' },
    { id: 'color-replace', label: 'Color Replace', icon: Pipette, premium: 'premium-filters' },
    { id: 'dodge-burn', label: 'Dodge/Burn', icon: Sparkles, premium: 'premium-filters' },
    { id: 'hand', label: 'Hand', icon: Hand },
    { id: 'zoom', label: 'Zoom', icon: ZoomIn }
  ]
];

export function StudioToolbar({ activeTool, premiumEnabled, onToolSelect, onRequestPremium }: StudioToolbarProps) {
  return (
    <aside className="studio-toolbar">
      {toolGroups.map((group, groupIndex) => (
        <div className="studio-toolbar-group" key={groupIndex}>
          {group.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                className={activeTool === tool.id ? 'active' : ''}
                title={tool.premium ? `${tool.label} - Pro` : tool.label}
                onClick={() => {
                  if (tool.premium && !premiumEnabled) {
                    onRequestPremium(tool.premium, tool.label);
                    return;
                  }
                  onToolSelect(tool.id);
                }}
              >
                <Icon size={17} />
                <span>{tool.label}</span>
                {tool.premium && !premiumEnabled && <i>Pro</i>}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
