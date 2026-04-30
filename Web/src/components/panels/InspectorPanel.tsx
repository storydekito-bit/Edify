import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, Pin, RotateCcw, SlidersHorizontal, Sparkle, Trash2, Unlock } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { premiumTextAnimationPresets, textAnimationPresets, transitionPresets } from '../../lib/presets';
import type { EditorController } from '../../state/useEditorState';
import type { Clip, EffectInstance, ProjectSettings as EdifyProjectSettings } from '../../types/edify';

const projectFormats: Record<EdifyProjectSettings['aspectRatio'], Pick<EdifyProjectSettings, 'aspectRatio' | 'resolution'>> = {
  '16:9': { aspectRatio: '16:9', resolution: { width: 1920, height: 1080 } },
  '9:16': { aspectRatio: '9:16', resolution: { width: 1080, height: 1920 } },
  '1:1': { aspectRatio: '1:1', resolution: { width: 1080, height: 1080 } },
  '4:5': { aspectRatio: '4:5', resolution: { width: 1080, height: 1350 } },
  '21:9': { aspectRatio: '21:9', resolution: { width: 2560, height: 1080 } }
};

const transitionQuickPicks = [
  'Fade',
  'Luma Dream Dissolve',
  'Glass Swipe',
  'Whip Pan',
  'Shockwave Cut',
  'Glitch Portal',
  'Smooth Cross Zoom',
  'Film Burn',
  'Impact Whip Pro',
  'Luxury Swipe'
];

const colorQuickPicks = [
  'Contrast Boost',
  'Saturation Boost',
  'Warm Tone',
  'Cinematic Cool Tone',
  'Teal Orange Deluxe',
  'Soft Film',
  'Black and White',
  'Luxury Product Shine',
  'Gaming Highlight',
  'Midnight Teal Grade'
];

const motionQuickPicks = [
  'Zoom Punch',
  'Motion Blur',
  'Shake',
  'Speed Ramp Shock',
  'Glow',
  'RGB Shift'
];

const textStyleQuickPicks = [
  'Text glow',
  'Text stroke',
  'Text shadow',
  'Lower third box',
  'Creator Pop Subtitle',
  'Diamond Caption',
  'Luxury Lower Third',
  'Neon HUD Title'
];

function effectKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function effectMatches(effect: EffectInstance, name: string, kind?: string) {
  return effect.name === name || effect.kind === (kind ?? effectKey(name));
}

export function InspectorPanel({ editor }: { editor: EditorController }) {
  const clip = editor.selectedClip;
  const [pinned, setPinned] = useState(false);
  const textAnimationChoices = useMemo(
    () => textAnimationPresets.slice(0, 20).concat(premiumTextAnimationPresets.slice(0, 8).map((item) => item.name)),
    []
  );

  if (!clip) {
    return (
      <aside className="inspector-panel">
        <div className="panel-heading">
          <span>Inspector</span>
          <small>No selection</small>
        </div>
        <div className="empty-state">
          <SlidersHorizontal size={26} />
          <strong>Select a clip</strong>
          <span>Transform, motion, color, audio, text, transitions, and effects appear here.</span>
        </div>
        <ProjectSettings editor={editor} />
      </aside>
    );
  }

  const update = (path: string, value: number | string) => {
    editor.updateClip(clip.id, (current) => {
      if (path.startsWith('transform.')) {
        const key = path.replace('transform.', '') as keyof typeof current.transform;
        return { ...current, transform: { ...current.transform, [key]: Number(value) } };
      }
      if (path.startsWith('audio.')) {
        const key = path.replace('audio.', '') as keyof typeof current.audio;
        return { ...current, audio: { ...current.audio, [key]: Number(value) } };
      }
      if (path === 'color') return { ...current, color: String(value) };
      if (path === 'text') return { ...current, text: String(value) };
      if (path === 'name') return { ...current, name: String(value) };
      if (path === 'start') return { ...current, start: Math.max(0, Number(value)) };
      if (path === 'duration') return { ...current, duration: Math.max(0.25, Number(value)) };
      if (path === 'inPoint') return { ...current, inPoint: Math.max(0, Number(value)) };
      return current;
    });
  };

  const findEffect = (name: string, kind?: string) =>
    clip.effects.find((effect) => effectMatches(effect, name, kind));

  const effectValue = (name: string, kind?: string, fallback = 0) =>
    findEffect(name, kind)?.intensity ?? fallback;

  const hasEffect = (name: string, kind?: string) =>
    Boolean(findEffect(name, kind)?.enabled);

  const setEffect = (name: string, kind = effectKey(name), intensity = 70) => {
    editor.updateClip(clip.id, (current) => {
      const existing = current.effects.find((effect) => effectMatches(effect, name, kind));
      if (existing) {
        return {
          ...current,
          effects: current.effects.map((effect) =>
            effect.id === existing.id ? { ...effect, name, kind, enabled: true, intensity } : effect
          )
        };
      }
      return {
        ...current,
        effects: [
          ...current.effects,
          {
            id: `fx-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            name,
            kind,
            enabled: true,
            intensity
          }
        ]
      };
    });
  };

  const toggleEffect = (name: string, kind = effectKey(name), intensity = 70) => {
    editor.updateClip(clip.id, (current) => {
      const existing = current.effects.find((effect) => effectMatches(effect, name, kind));
      if (!existing) {
        return {
          ...current,
          effects: [
            ...current.effects,
            {
              id: `fx-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
              name,
              kind,
              enabled: true,
              intensity
            }
          ]
        };
      }
      return {
        ...current,
        effects: current.effects.map((effect) =>
          effect.id === existing.id ? { ...effect, enabled: !effect.enabled, intensity: effect.intensity || intensity } : effect
        )
      };
    });
  };

  const setTransition = (patch: Partial<NonNullable<Clip['transition']>>) => {
    editor.updateClip(clip.id, (current) => ({
      ...current,
      transition: {
        style: current.transition?.style ?? 'Fade',
        easing: current.transition?.easing ?? 'Cubic out',
        duration: current.transition?.duration ?? 0.8,
        placement: current.transition?.placement ?? 'center',
        at: current.transition?.at ?? current.start + current.duration,
        ...patch
      }
    }));
  };

  const applyTransitionPreset = (name: string) => {
    setTransition({
      style: name,
      duration: clip.transition?.duration ?? 0.74,
      placement: clip.transition?.placement ?? 'center',
      at: clip.start + clip.duration
    });
  };

  return (
    <aside className="inspector-panel">
      <div className="panel-heading">
        <span>Inspector</span>
        <small>{clip.kind}</small>
      </div>

      <div className="selection-card">
        <div>
          <strong>{clip.name}</strong>
          <small>{clip.duration.toFixed(2)}s on {clip.trackId.slice(0, 8)}</small>
        </div>
        <button className={`icon-button ${pinned ? 'active-pin' : ''}`} title="Pin controls" onClick={() => setPinned((current) => !current)}>
          <Pin size={15} />
        </button>
      </div>

      <InspectorGroup title="Clip Info">
        <label className="field full">
          <span>Name</span>
          <input value={clip.name} onChange={(event) => update('name', event.target.value)} />
        </label>
        <NumberField label="Start" value={clip.start} step={0.1} onChange={(value) => update('start', value)} />
        <NumberField label="Duration" value={clip.duration} step={0.1} onChange={(value) => update('duration', value)} />
        <NumberField label="In point" value={clip.inPoint} step={0.1} onChange={(value) => update('inPoint', value)} />
        <label className="field full">
          <span>Clip color label</span>
          <input type="color" value={clip.color} onChange={(event) => update('color', event.target.value)} />
        </label>
      </InspectorGroup>

      <InspectorGroup title="Transform">
        <NumberField label="Position X" value={clip.transform.x} onChange={(value) => update('transform.x', value)} />
        <NumberField label="Position Y" value={clip.transform.y} onChange={(value) => update('transform.y', value)} />
        <NumberField label="Scale" value={clip.transform.scale} step={0.05} onChange={(value) => update('transform.scale', value)} />
        <NumberField label="Rotation" value={clip.transform.rotation} onChange={(value) => update('transform.rotation', value)} />
        <SliderField label="Opacity" value={clip.transform.opacity * 100} onChange={(value) => update('transform.opacity', value / 100)} />
        <button className="secondary-button" onClick={() => editor.moveSelectedClipLayer('up')}>
          <ChevronUp size={15} />
          Move up
        </button>
        <button className="secondary-button" onClick={() => editor.moveSelectedClipLayer('down')}>
          <ChevronDown size={15} />
          Move down
        </button>
        <div className="inspector-chip-grid">
          <ChipButton label="Center" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, transform: { ...current.transform, x: 0, y: 0 } }))} />
          <ChipButton label="Left" onClick={() => update('transform.x', -220)} />
          <ChipButton label="Right" onClick={() => update('transform.x', 220)} />
          <ChipButton label="Top" onClick={() => update('transform.y', -140)} />
          <ChipButton label="Bottom" onClick={() => update('transform.y', 140)} />
          <ChipButton
            label="Reset"
            onClick={() =>
              editor.updateClip(clip.id, (current) => ({
                ...current,
                transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }
              }))
            }
          />
        </div>
      </InspectorGroup>

      {(clip.kind === 'video' || clip.kind === 'image') && (
        <>
          <InspectorGroup title="Motion">
            <SliderField label="Speed" value={effectValue('Speed', 'speed', 100)} min={10} max={400} onChange={(value) => setEffect(`Speed ${value}%`, 'speed', value)} />
            <SliderField label="Motion blur" value={effectValue('Motion Blur')} onChange={(value) => setEffect('Motion Blur', 'motion-blur', value)} />
            <SliderField label="Shake" value={effectValue('Shake')} onChange={(value) => setEffect('Shake', 'shake', value)} />
            <SliderField label="Zoom punch" value={effectValue('Zoom Punch')} onChange={(value) => setEffect('Zoom Punch', 'zoom-punch', value)} />
            <div className="inspector-chip-grid">
              {motionQuickPicks.map((item) => (
                <ChipButton key={item} label={item} active={hasEffect(item)} onClick={() => toggleEffect(item, effectKey(item), 72)} />
              ))}
            </div>
          </InspectorGroup>

          <InspectorGroup title="Color">
            <SliderField label="Blur" value={effectValue('Blur')} onChange={(value) => setEffect('Blur', 'blur', value)} />
            <SliderField label="Sharpen" value={effectValue('Sharpen')} onChange={(value) => setEffect('Sharpen', 'sharpen', value)} />
            <SliderField label="Glow" value={effectValue('Glow')} onChange={(value) => setEffect('Glow', 'glow', value)} />
            <SliderField label="Vignette" value={effectValue('Vignette')} onChange={(value) => setEffect('Vignette', 'vignette', value)} />
            <SliderField label="RGB shift" value={effectValue('RGB Shift', 'rgb-shift')} onChange={(value) => setEffect('RGB Shift', 'rgb-shift', value)} />
            <div className="inspector-chip-grid">
              {colorQuickPicks.map((item) => (
                <ChipButton key={item} label={item} active={hasEffect(item)} onClick={() => toggleEffect(item, effectKey(item), 70)} />
              ))}
            </div>
          </InspectorGroup>

          <InspectorGroup title="Frame & Finish">
            <div className="inspector-chip-grid">
              <ChipButton label="Freeze frame" active={hasEffect('Freeze frame')} onClick={() => toggleEffect('Freeze frame', 'freeze-frame', 100)} />
              <ChipButton label="Background blur" active={hasEffect('Portrait background blur', 'background-blur')} onClick={() => toggleEffect('Portrait background blur', 'background-blur', 70)} />
              <ChipButton label="Cinematic bars" active={hasEffect('Cinematic bars', 'cinematic-bars')} onClick={() => toggleEffect('Cinematic bars', 'cinematic-bars', 80)} />
              <ChipButton label="Gaming highlight" active={hasEffect('Gaming Highlight', 'gaming-highlight')} onClick={() => toggleEffect('Gaming Highlight', 'gaming-highlight', 72)} />
              <ChipButton label="Safe zone" active={hasEffect('Safe Zone Guides', 'safe-zone-guides')} onClick={() => toggleEffect('Safe Zone Guides', 'safe-zone-guides', 62)} />
              <ChipButton label="Reset look" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, effects: current.effects.filter((effect) => !/(blur|sharpen|glow|vignette|rgb|contrast|saturation|warm|cool|gaming|bars|background)/i.test(effect.kind + effect.name)) }))} />
            </div>
          </InspectorGroup>
        </>
      )}

      {clip.kind === 'text' && (
        <>
          <InspectorGroup title="Text Content">
            <label className="field full">
              <span>Content</span>
              <textarea value={clip.text ?? ''} onChange={(event) => update('text', event.target.value)} />
            </label>
            <NumberField label="Font size" value={Math.round(64 * clip.transform.scale)} onChange={(value) => update('transform.scale', value / 64)} />
            <button className="secondary-button" onClick={() => update('text', (clip.text ?? '').toUpperCase())}>Uppercase</button>
            <button className="secondary-button" onClick={() => update('text', (clip.text ?? '').toLowerCase())}>Lowercase</button>
          </InspectorGroup>

          <InspectorGroup title="Text Style">
            <SliderField label="Glow" value={effectValue('Text glow', 'text-glow', 44)} onChange={(value) => setEffect('Text glow', 'text-glow', value)} />
            <SliderField label="Stroke" value={effectValue('Text stroke', 'text-stroke')} onChange={(value) => setEffect('Text stroke', 'text-stroke', value)} />
            <SliderField label="Shadow" value={effectValue('Text shadow', 'text-shadow', 35)} onChange={(value) => setEffect('Text shadow', 'text-shadow', value)} />
            <div className="inspector-chip-grid">
              {textStyleQuickPicks.map((item) => (
                <ChipButton key={item} label={item} active={hasEffect(item, effectKey(item))} onClick={() => toggleEffect(item, effectKey(item), 76)} />
              ))}
            </div>
          </InspectorGroup>

          <InspectorGroup title="Text Layout">
            <div className="inspector-chip-grid">
              <ChipButton label="Center text" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, transform: { ...current.transform, x: 0, y: 0 } }))} />
              <ChipButton label="Title top" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, transform: { ...current.transform, x: 0, y: -180 } }))} />
              <ChipButton label="Subtitle low" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, transform: { ...current.transform, x: 0, y: 220 } }))} />
              <ChipButton label="Left card" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, transform: { ...current.transform, x: -220, y: 120 } }))} />
              <ChipButton label="Right card" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, transform: { ...current.transform, x: 220, y: 120 } }))} />
              <ChipButton label="Reset layout" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, transform: { ...current.transform, x: 0, y: 0, rotation: 0 } }))} />
            </div>
          </InspectorGroup>

          <InspectorGroup title="Text Animations">
            <div className="inspector-chip-grid">
              {textAnimationChoices.map((animation) => (
                <ChipButton
                  key={animation}
                  label={animation}
                  active={hasEffect(animation, effectKey(animation))}
                  premium={premiumTextAnimationPresets.some((item) => item.name === animation)}
                  onClick={() => setEffect(animation, effectKey(animation), premiumTextAnimationPresets.some((item) => item.name === animation) ? 90 : 85)}
                />
              ))}
            </div>
          </InspectorGroup>
        </>
      )}

      {(clip.kind === 'audio' || clip.kind === 'video') && (
        <>
          <InspectorGroup title="Audio Mix">
            <SliderField label="Volume" value={clip.audio.volume * 100} onChange={(value) => update('audio.volume', value / 100)} />
            <SliderField label="Fade in" value={clip.audio.fadeIn} max={4} step={0.1} onChange={(value) => update('audio.fadeIn', value)} />
            <SliderField label="Fade out" value={clip.audio.fadeOut} max={4} step={0.1} onChange={(value) => update('audio.fadeOut', value)} />
            <SliderField label="Denoise" value={clip.audio.denoise} onChange={(value) => update('audio.denoise', value)} />
            <SliderField label="Pitch" value={clip.audio.pitch} min={-12} max={12} step={1} onChange={(value) => update('audio.pitch', value)} />
            <div className="inspector-chip-grid">
              <ChipButton label="Mute" active={clip.audio.volume <= 0.001} onClick={() => update('audio.volume', clip.audio.volume <= 0.001 ? 0.82 : 0)} />
              <ChipButton label="Podcast clean" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, audio: { ...current.audio, volume: 0.78, denoise: 58, fadeIn: Math.max(current.audio.fadeIn, 0.08), fadeOut: Math.max(current.audio.fadeOut, 0.12) } }))} />
              <ChipButton label="Hard hit" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, audio: { ...current.audio, volume: 0.94, denoise: Math.max(current.audio.denoise, 22), fadeIn: 0.02, fadeOut: 0.08 } }))} />
              <ChipButton label="Smooth fade" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, audio: { ...current.audio, fadeIn: 0.35, fadeOut: 0.35 } }))} />
            </div>
          </InspectorGroup>

          <InspectorGroup title="Audio Tools">
            <div className="inspector-chip-grid">
              <ChipButton label="Denoise" active={clip.audio.denoise > 0} onClick={() => update('audio.denoise', clip.audio.denoise > 0 ? 0 : 55)} />
              <ChipButton label="Studio voice" active={hasEffect('Studio Voice')} onClick={() => toggleEffect('Studio Voice', 'studio-voice', 74)} />
              <ChipButton label="Normalize" active={hasEffect('Normalize')} onClick={() => toggleEffect('Normalize', 'normalize', 72)} />
              <ChipButton label="Remove silence" active={hasEffect('Remove Silence')} onClick={() => toggleEffect('Remove Silence', 'remove-silence', 72)} />
              <ChipButton label="Pitch polish" active={hasEffect('Pitch Polish')} onClick={() => toggleEffect('Pitch Polish', 'pitch-polish', 68)} />
              <ChipButton label="Reset audio" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, audio: { volume: clip.kind === 'audio' ? 0.82 : 0.82, fadeIn: 0, fadeOut: 0, pitch: 0, denoise: 0 } }))} />
            </div>
          </InspectorGroup>
        </>
      )}

      <InspectorGroup title="Transition">
        <label className="field full">
          <span>Style</span>
          <input value={clip.transition?.style ?? ''} placeholder="Drop or choose a transition" onChange={(event) => setTransition({ style: event.target.value })} />
        </label>
        <SliderField
          label="Duration"
          value={clip.transition?.duration ?? 0.8}
          min={0.2}
          max={3}
          step={0.1}
          onChange={(value) => setTransition({ duration: value })}
        />
        <label className="field">
          <span>Placement</span>
          <select
            value={clip.transition?.placement ?? 'center'}
            onChange={(event) => {
              const placement = event.target.value as 'start' | 'center' | 'end';
              setTransition({
                placement,
                at: placement === 'start' ? clip.start : clip.start + clip.duration
              });
            }}
          >
            <option value="start">Start</option>
            <option value="center">Between clips</option>
            <option value="end">End</option>
          </select>
        </label>
        <label className="field">
          <span>Easing</span>
          <select value={clip.transition?.easing ?? 'Cubic out'} onChange={(event) => setTransition({ easing: event.target.value })}>
            <option>Cubic out</option>
            <option>Smooth</option>
            <option>Linear</option>
            <option>Elastic</option>
          </select>
        </label>
        <div className="inspector-chip-grid">
          {transitionQuickPicks.map((name) => (
            <ChipButton key={name} label={name} active={clip.transition?.style === name} onClick={() => applyTransitionPreset(name)} />
          ))}
        </div>
        <div className="inspector-chip-grid">
          {transitionPresets.slice(10, 20).map((name) => (
            <ChipButton key={name} label={name} active={clip.transition?.style === name} onClick={() => applyTransitionPreset(name)} />
          ))}
        </div>
        <button className="secondary-button full-width-action" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, transition: undefined }))}>
          Remove transition
        </button>
      </InspectorGroup>

      <InspectorGroup title="Effects Stack">
        {clip.effects.length === 0 ? (
          <div className="mini-empty">
            <Sparkle size={15} />
            Add effects from the left panel.
          </div>
        ) : (
          clip.effects.map((effect) => (
            <div className="effect-row" key={effect.id}>
              <button
                title="Toggle effect"
                onClick={() =>
                  editor.updateClip(clip.id, (current) => ({
                    ...current,
                    effects: current.effects.map((item) =>
                      item.id === effect.id ? { ...item, enabled: !item.enabled } : item
                    )
                  }))
                }
              >
                {effect.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <span>{effect.name}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={effect.intensity}
                onChange={(event) =>
                  editor.updateClip(clip.id, (current) => ({
                    ...current,
                    effects: current.effects.map((item) =>
                      item.id === effect.id ? { ...item, intensity: Number(event.target.value) } : item
                    )
                  }))
                }
              />
              <button
                title="Remove effect"
                onClick={() =>
                  editor.updateClip(clip.id, (current) => ({
                    ...current,
                    effects: current.effects.filter((item) => item.id !== effect.id)
                  }))
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
        {clip.effects.length > 0 && (
          <>
            <button className="secondary-button full-width-action" onClick={editor.applySelectedEffectsToAllClips}>
              Apply effects to all {clip.kind === 'audio' ? 'audio' : clip.kind === 'text' ? 'text' : 'video'} clips
            </button>
            <button className="secondary-button full-width-action" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, effects: [] }))}>
              <RotateCcw size={15} />
              Clear all effects
            </button>
          </>
        )}
      </InspectorGroup>

      <div className="inspector-actions">
        <button className="secondary-button" onClick={() => editor.updateClip(clip.id, (current) => ({ ...current, locked: !current.locked }))}>
          {clip.locked ? <Unlock size={15} /> : <Lock size={15} />}
          {clip.locked ? 'Unlock' : 'Lock'}
        </button>
        <button className="danger-button" onClick={editor.deleteSelectedClip}>
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </aside>
  );
}

function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inspector-group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" step={step} value={Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function SliderField({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field full">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ChipButton({
  label,
  active = false,
  premium = false,
  onClick
}: {
  label: string;
  active?: boolean;
  premium?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`inspector-chip ${active ? 'active' : ''} ${premium ? 'premium' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

function ProjectSettings({ editor }: { editor: EditorController }) {
  return (
    <section className="inspector-group">
      <h3>Project Settings</h3>
      <div className="settings-grid">
        <span>Resolution</span>
        <strong>{editor.project.settings.resolution.width} x {editor.project.settings.resolution.height}</strong>
        <span>Format</span>
        <select
          value={editor.project.settings.aspectRatio}
          onChange={(event) => editor.updateProjectSettings(projectFormats[event.target.value as EdifyProjectSettings['aspectRatio']])}
        >
          <option value="16:9">16:9 Landscape</option>
          <option value="9:16">9:16 Vertical</option>
          <option value="1:1">1:1 Square</option>
          <option value="4:5">4:5 Social</option>
          <option value="21:9">21:9 Cinema</option>
        </select>
        <span>FPS</span>
        <strong>{editor.project.settings.fps}</strong>
        <span>Sample rate</span>
        <strong>{editor.project.settings.sampleRate} Hz</strong>
        <span>Background</span>
        <strong>{editor.project.settings.backgroundColor}</strong>
      </div>
    </section>
  );
}
