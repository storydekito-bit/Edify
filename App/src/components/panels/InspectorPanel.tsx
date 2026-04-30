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

const lutQuickPicks = [
  'Creator Clean LUT',
  'Cinematic Teal LUT',
  'Luxury Product LUT',
  'Podcast Skin Tone LUT',
  'Gaming Neon LUT',
  'Travel Warm LUT'
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
  const [activeMotionProperty, setActiveMotionProperty] = useState<Clip['keyframes'][number]['property']>('x');
  const [keyframeZoom, setKeyframeZoom] = useState(1.4);
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

  const keyframes = [...clip.keyframes].sort((left, right) => left.time - right.time);
  const visibleMotionProperties = (clip.kind === 'audio' || clip.kind === 'video')
    ? (['x', 'y', 'scale', 'rotation', 'opacity', 'volume'] as const)
    : (['x', 'y', 'scale', 'rotation', 'opacity'] as const);
  const propertyFrames = keyframes.filter((frame) => frame.property === activeMotionProperty);
  const motionEasing = clip.effects.find((effect) => effect.enabled && /motion easing:/i.test(effect.name))?.name.replace('Motion Easing: ', '') ?? 'Cubic out';
  const clipSpan = Math.max(0.25, clip.duration);
  const scrubberPercent = `${Math.max(0, Math.min(100, ((editor.playhead - clip.start) / clipSpan) * 100))}%`;
  const keyframeTrackWidth = `${Math.max(100, keyframeZoom * 100)}%`;
  const timelineCurvePath = buildCurvePath(propertyFrames, clip, activeMotionProperty);

  const addKeyframe = (property: Clip['keyframes'][number]['property']) => {
    editor.updateClip(clip.id, (current) => {
      const currentValue =
        property === 'x'
          ? current.transform.x
          : property === 'y'
            ? current.transform.y
            : property === 'scale'
              ? current.transform.scale
              : property === 'rotation'
                ? current.transform.rotation
                : property === 'opacity'
                  ? current.transform.opacity
                  : current.audio.volume;
      const currentTime = Math.max(current.start, Math.min(editor.playhead, current.start + current.duration));
      const existing = current.keyframes.find((frame) => frame.property === property && Math.abs(frame.time - currentTime) < 1 / editor.project.settings.fps);
      if (existing) {
        return {
          ...current,
          keyframes: current.keyframes.map((frame) =>
            frame.id === existing.id ? { ...frame, time: currentTime, value: currentValue } : frame
          )
        };
      }
      return {
        ...current,
        keyframes: [
          ...current.keyframes,
          {
            id: `keyframe-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            time: currentTime,
            property,
            value: currentValue
          }
        ]
      };
    });
  };

  const removeKeyframe = (keyframeId: string) => {
    editor.updateClip(clip.id, (current) => ({
      ...current,
      keyframes: current.keyframes.filter((frame) => frame.id !== keyframeId)
    }));
  };

  const applyKeyframePreset = (preset: 'fade-in' | 'push-right' | 'pop-in') => {
    editor.updateClip(clip.id, (current) => {
      const clipStart = current.start;
      const accentTime = Math.min(current.start + Math.max(0.3, current.duration * 0.18), current.start + current.duration);
      const endTime = Math.min(current.start + Math.max(0.55, current.duration * 0.32), current.start + current.duration);
      const freshKeyframes = current.keyframes.filter((frame) =>
        preset === 'fade-in'
          ? frame.property !== 'opacity'
          : preset === 'push-right'
            ? !['x', 'opacity'].includes(frame.property)
            : !['scale', 'opacity'].includes(frame.property)
      );
      if (preset === 'fade-in') {
        return {
          ...current,
          keyframes: [
            ...freshKeyframes,
            { id: `keyframe-${Date.now()}-a`, time: clipStart, property: 'opacity', value: 0 },
            { id: `keyframe-${Date.now()}-b`, time: endTime, property: 'opacity', value: current.transform.opacity }
          ]
        };
      }
      if (preset === 'push-right') {
        return {
          ...current,
          keyframes: [
            ...freshKeyframes,
            { id: `keyframe-${Date.now()}-a`, time: clipStart, property: 'x', value: current.transform.x - 180 },
            { id: `keyframe-${Date.now()}-b`, time: accentTime, property: 'opacity', value: 0.2 },
            { id: `keyframe-${Date.now()}-c`, time: endTime, property: 'x', value: current.transform.x },
            { id: `keyframe-${Date.now()}-d`, time: endTime, property: 'opacity', value: current.transform.opacity }
          ]
        };
      }
      return {
        ...current,
        keyframes: [
          ...freshKeyframes,
          { id: `keyframe-${Date.now()}-a`, time: clipStart, property: 'scale', value: Math.max(0.72, current.transform.scale * 0.78) },
          { id: `keyframe-${Date.now()}-b`, time: clipStart, property: 'opacity', value: 0.25 },
          { id: `keyframe-${Date.now()}-c`, time: accentTime, property: 'scale', value: current.transform.scale * 1.08 },
          { id: `keyframe-${Date.now()}-d`, time: endTime, property: 'scale', value: current.transform.scale },
          { id: `keyframe-${Date.now()}-e`, time: endTime, property: 'opacity', value: current.transform.opacity }
        ]
      };
    });
  };

  const setMotionEasing = (label: 'Cubic out' | 'Smooth' | 'Linear' | 'Elastic') => {
    const effectName = `Motion Easing: ${label}`;
    editor.updateClip(clip.id, (current) => {
      const existing = current.effects.find((effect) => /motion easing:/i.test(effect.name));
      if (existing) {
        return {
          ...current,
          effects: current.effects.map((effect) =>
            effect.id === existing.id
              ? { ...effect, name: effectName, kind: 'motion-easing', intensity: 70, enabled: true }
              : effect
          )
        };
      }
      return {
        ...current,
        effects: [
          ...current.effects,
          { id: `fx-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, name: effectName, kind: 'motion-easing', intensity: 70, enabled: true }
        ]
      };
    });
  };

  const moveKeyframeTime = (keyframeId: string, nextTime: number) => {
    editor.updateClip(clip.id, (current) => ({
      ...current,
      keyframes: current.keyframes.map((frame) =>
        frame.id === keyframeId
          ? { ...frame, time: Math.max(current.start, Math.min(current.start + current.duration, nextTime)) }
          : frame
      )
    }));
  };

  const addKeyframeAtRatio = (ratio: number) => {
    const nextTime = clip.start + clip.duration * Math.max(0, Math.min(1, ratio));
    editor.updateClip(clip.id, (current) => {
      const currentValue =
        activeMotionProperty === 'x'
          ? current.transform.x
          : activeMotionProperty === 'y'
            ? current.transform.y
            : activeMotionProperty === 'scale'
              ? current.transform.scale
              : activeMotionProperty === 'rotation'
                ? current.transform.rotation
                : activeMotionProperty === 'opacity'
                  ? current.transform.opacity
                  : current.audio.volume;
      return {
        ...current,
        keyframes: [
          ...current.keyframes,
          {
            id: `keyframe-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            time: nextTime,
            property: activeMotionProperty,
            value: currentValue
          }
        ]
      };
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

      <InspectorGroup title="Keyframes">
        <div className="inspector-chip-grid">
          {visibleMotionProperties.map((property) => (
            <ChipButton
              key={property}
              label={property === 'x' ? 'X' : property === 'y' ? 'Y' : property === 'scale' ? 'Scale' : property === 'rotation' ? 'Rotation' : property === 'opacity' ? 'Opacity' : 'Volume'}
              active={activeMotionProperty === property}
              onClick={() => setActiveMotionProperty(property)}
            />
          ))}
        </div>
        <div className="inspector-chip-grid">
          <ChipButton label="Add key" onClick={() => addKeyframe(activeMotionProperty)} />
          <ChipButton label="Fade in" onClick={() => applyKeyframePreset('fade-in')} />
          <ChipButton label="Push intro" onClick={() => applyKeyframePreset('push-right')} />
          <ChipButton label="Pop intro" onClick={() => applyKeyframePreset('pop-in')} />
          <ChipButton label="Copy motion" onClick={editor.applySelectedMotionToAllClips} />
          <ChipButton label="Zoom +" onClick={() => setKeyframeZoom((current) => Math.min(4, Number((current + 0.3).toFixed(2))))} />
          <ChipButton label="Zoom -" onClick={() => setKeyframeZoom((current) => Math.max(1, Number((current - 0.3).toFixed(2))))} />
        </div>
        <div className="inspector-chip-grid">
          {(['Cubic out', 'Smooth', 'Linear', 'Elastic'] as const).map((label) => (
            <ChipButton key={label} label={label} active={motionEasing === label} onClick={() => setMotionEasing(label)} />
          ))}
        </div>
        <div className="motion-curve-card">
          <div className="motion-curve-head">
            <strong>{activeMotionProperty === 'volume' ? 'Audio volume curve' : `${activeMotionProperty.toUpperCase()} motion curve`}</strong>
            <span>{motionEasing} - {propertyFrames.length} keyframe{propertyFrames.length === 1 ? '' : 's'}</span>
          </div>
          <div className="motion-curve-scroll">
            <div className="motion-curve-track" style={{ width: keyframeTrackWidth }} onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
              addKeyframeAtRatio(ratio);
            }}>
              <svg className="motion-curve-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d={timelineCurvePath} />
              </svg>
              <span className="motion-track-playhead" style={{ left: scrubberPercent }} />
              {propertyFrames.map((frame) => (
                <button
                  key={frame.id}
                  className="motion-keyframe-dot"
                  style={{ left: `${((frame.time - clip.start) / clipSpan) * 100}%` }}
                  title={`${frame.property} - ${frame.time.toFixed(2)}s`}
                  onClick={(event) => {
                    event.stopPropagation();
                    editor.setPlayhead(frame.time);
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    const move = (moveEvent: PointerEvent) => {
                      const ratio = (moveEvent.clientX - rect.left) / Math.max(1, rect.width);
                      moveKeyframeTime(frame.id, clip.start + clip.duration * Math.max(0, Math.min(1, ratio)));
                    };
                    const up = () => {
                      window.removeEventListener('pointermove', move);
                      window.removeEventListener('pointerup', up);
                    };
                    window.addEventListener('pointermove', move);
                    window.addEventListener('pointerup', up);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mini-empty keyframe-summary">
          <Sparkle size={15} />
          {keyframes.length > 0
            ? `${keyframes.length} keyframe${keyframes.length > 1 ? 's' : ''} linked to this clip. Click the graph to add, drag dots to retime, or zoom the lane for precise work.`
            : `Add motion keys at ${editor.playhead.toFixed(2)}s from the current clip values.`}
        </div>
        {keyframes.length > 0 && (
          <div className="keyframe-list">
            {keyframes.map((frame) => (
              <div className="keyframe-row" key={frame.id}>
                <button className="timeline-jump-button" onClick={() => editor.setPlayhead(frame.time)}>
                  {frame.property}
                </button>
                <span>{frame.time.toFixed(2)}s</span>
                <strong>{Number(frame.value.toFixed(2))}</strong>
                <button className="icon-button" title="Remove keyframe" onClick={() => removeKeyframe(frame.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
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

          <InspectorGroup title="Color Studio">
            <div className="color-wheel-grid">
              {[
                { label: 'Lift', accent: '#2e83ff', effect: 'Lift Control' },
                { label: 'Gamma', accent: '#42e8ff', effect: 'Gamma Control' },
                { label: 'Gain', accent: '#ffd166', effect: 'Gain Control' }
              ].map((wheel) => (
                <button
                  key={wheel.label}
                  className="color-wheel-card"
                  onClick={() => setEffect(wheel.effect, effectKey(wheel.effect), 66)}
                >
                  <span className="color-wheel-swatch" style={{ background: `radial-gradient(circle at 35% 35%, ${wheel.accent}, rgba(10,14,22,.18) 72%)` }} />
                  <strong>{wheel.label}</strong>
                  <small>{wheel.effect}</small>
                </button>
              ))}
            </div>
            <div className="inspector-chip-grid">
              <ChipButton label="RGB Curves" onClick={() => setEffect('RGB Curves', 'rgb-curves', 74)} />
              <ChipButton label="Luma Curve" onClick={() => setEffect('Luma Curve', 'luma-curve', 74)} />
              <ChipButton label="Skin Tone Protect" onClick={() => setEffect('Skin Tone Protect', 'skin-tone-protect', 70)} />
              <ChipButton label="Before / After" onClick={() => toggleEffect('Before After Compare', 'before-after-compare', 72)} />
              <ChipButton label="Waveform Scope" onClick={() => setEffect('Waveform Scope', 'waveform-scope', 60)} />
              <ChipButton label="Vectorscope" onClick={() => setEffect('Vectorscope', 'vectorscope', 60)} />
            </div>
            <div className="color-curve-card">
              <div className="color-curve-scopes">
                <div className="scope-box scope-waveform"><i /><i /><i /></div>
                <div className="scope-box scope-parade"><i /><i /><i /></div>
                <div className="scope-box scope-vector"><i /></div>
              </div>
              <div className="color-lut-list">
                {lutQuickPicks.map((lut) => (
                  <button key={lut} className="color-lut-row" onClick={() => setEffect(lut, effectKey(lut), 72)}>
                    <span className={`lut-preview lut-${effectKey(lut)}`} />
                    <strong>{lut}</strong>
                    <small>Apply LUT</small>
                  </button>
                ))}
              </div>
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

function buildCurvePath(
  frames: Clip['keyframes'],
  clip: Clip,
  property: Clip['keyframes'][number]['property']
) {
  const relevant = frames.filter((frame) => frame.property === property).sort((left, right) => left.time - right.time);
  if (relevant.length === 0) {
    return 'M 0 72 C 20 72, 40 72, 60 72 S 100 72, 100 72';
  }
  const values = relevant.map((frame) => frame.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.001, max - min);
  const points = relevant.map((frame) => {
    const x = ((frame.time - clip.start) / Math.max(0.001, clip.duration)) * 100;
    const y = 84 - (((frame.value - min) / span) * 68 + (span < 0.01 ? 34 : 0));
    return { x, y: Math.max(10, Math.min(90, y)) };
  });
  if (points.length === 1) {
    return `M 0 ${points[0].y} L 100 ${points[0].y}`;
  }
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = previous.x + (point.x - previous.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
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
