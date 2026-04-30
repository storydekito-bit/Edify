import type {
  StudioImageLayer,
  StudioLayer,
  StudioProject,
  StudioShapeLayer,
  StudioTextLayer
} from '../types/studio';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

function layerFilterCss(layer: StudioLayer) {
  const filters: string[] = [];
  if (layer.adjustments.brightness) filters.push(`brightness(${1 + layer.adjustments.brightness / 100})`);
  if (layer.adjustments.contrast) filters.push(`contrast(${1 + layer.adjustments.contrast / 100})`);
  if (layer.adjustments.saturation) filters.push(`saturate(${1 + layer.adjustments.saturation / 100})`);
  if (layer.adjustments.hue) filters.push(`hue-rotate(${layer.adjustments.hue}deg)`);
  if (layer.filters.gaussianBlur) filters.push(`blur(${Math.max(0, layer.filters.gaussianBlur)}px)`);
  if (layer.filters.dropShadow) filters.push(`drop-shadow(0 10px ${Math.max(1, layer.filters.dropShadow)}px rgba(0,0,0,0.24))`);
  if (layer.filters.glow) filters.push(`drop-shadow(0 0 ${Math.max(1, layer.filters.glow)}px rgba(66,232,255,0.38))`);
  if (layer.filters.youtubeEnhance) filters.push(`contrast(${1 + layer.filters.youtubeEnhance / 100}) saturate(${1 + layer.filters.youtubeEnhance / 130})`);
  if (layer.filters.vintage) filters.push(`sepia(${layer.filters.vintage / 100})`);
  if (layer.adjustments.invert) filters.push(`invert(${layer.adjustments.invert / 100})`);
  if (layer.adjustments.blackAndWhite) filters.push(`grayscale(${layer.adjustments.blackAndWhite / 100})`);
  return filters.join(' ');
}

function svgTransform(layer: StudioLayer) {
  return `translate(${layer.x} ${layer.y}) rotate(${layer.rotation} ${layer.width / 2} ${layer.height / 2})`;
}

function renderShapeLayer(layer: StudioShapeLayer) {
  const style = `opacity:${layer.opacity};mix-blend-mode:${cssBlendMode(layer.blendMode)};filter:${layerFilterCss(layer) || 'none'};`;
  const common = `fill="${escapeXml(layer.fill)}" stroke="${escapeXml(layer.strokeColor)}" stroke-width="${layer.strokeWidth}"`;
  if (layer.shape === 'ellipse') {
    return `<g transform="${svgTransform(layer)}" style="${style}"><ellipse cx="${layer.width / 2}" cy="${layer.height / 2}" rx="${layer.width / 2}" ry="${layer.height / 2}" ${common}/></g>`;
  }
  if (layer.shape === 'line') {
    return `<g transform="${svgTransform(layer)}" style="${style}"><line x1="0" y1="${layer.height / 2}" x2="${layer.width}" y2="${layer.height / 2}" stroke="${escapeXml(layer.strokeColor)}" stroke-width="${Math.max(2, layer.strokeWidth)}" stroke-linecap="round"/></g>`;
  }
  if (layer.shape === 'arrow') {
    const midY = layer.height / 2;
    const head = Math.min(36, layer.width * 0.16);
    return `<g transform="${svgTransform(layer)}" style="${style}"><line x1="0" y1="${midY}" x2="${layer.width - head}" y2="${midY}" stroke="${escapeXml(layer.strokeColor)}" stroke-width="${Math.max(2, layer.strokeWidth)}" stroke-linecap="round"/><path d="M ${layer.width - head} ${midY - head / 2} L ${layer.width} ${midY} L ${layer.width - head} ${midY + head / 2}" fill="none" stroke="${escapeXml(layer.strokeColor)}" stroke-width="${Math.max(2, layer.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  const radius = layer.shape === 'rounded-rectangle' ? Math.max(0, layer.radius ?? 24) : 0;
  return `<g transform="${svgTransform(layer)}" style="${style}"><rect width="${layer.width}" height="${layer.height}" rx="${radius}" ry="${radius}" ${common}/></g>`;
}

function renderTextLayer(layer: StudioTextLayer) {
  const weight = layer.fontWeight;
  const style = `opacity:${layer.opacity};mix-blend-mode:${cssBlendMode(layer.blendMode)};filter:${layerFilterCss(layer) || 'none'};font-family:${layer.fontFamily};font-size:${layer.fontSize}px;font-weight:${weight};letter-spacing:${layer.letterSpacing}px;`;
  const textAnchor = layer.align === 'center' ? 'middle' : layer.align === 'right' ? 'end' : 'start';
  const x = layer.align === 'center' ? layer.width / 2 : layer.align === 'right' ? layer.width : 0;
  const lines = layer.text.split('\n');
  const fill = layer.gradientText
    ? `url(#grad-${layer.id})`
    : escapeXml(layer.color);
  const defs = layer.gradientText
    ? `<defs><linearGradient id="grad-${layer.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${escapeXml(layer.gradientStart || layer.color)}"/><stop offset="100%" stop-color="${escapeXml(layer.gradientEnd || layer.color)}"/></linearGradient></defs>`
    : '';
  const tspans = lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? layer.fontSize : layer.fontSize * layer.lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
  const strokeAttrs = layer.strokeWidth && layer.strokeWidth > 0
    ? `stroke="${escapeXml(layer.strokeColor || '#000000')}" stroke-width="${layer.strokeWidth}" paint-order="stroke"`
    : '';
  return `<g transform="${svgTransform(layer)}" style="${style}">${defs}<text x="${x}" y="0" text-anchor="${textAnchor}" fill="${fill}" ${strokeAttrs}>${tspans}</text></g>`;
}

function renderImageLayer(layer: StudioImageLayer) {
  const style = `opacity:${layer.opacity};mix-blend-mode:${cssBlendMode(layer.blendMode)};filter:${layerFilterCss(layer) || 'none'};`;
  const preserveAspectRatio = layer.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';
  return `<g transform="${svgTransform(layer)}" style="${style}"><image href="${escapeXml(layer.src)}" x="0" y="0" width="${layer.width}" height="${layer.height}" preserveAspectRatio="${preserveAspectRatio}"/></g>`;
}

function renderAdjustmentLayer(layer: StudioLayer) {
  const opacity = Math.min(0.65, 0.12 + (layer.adjustments.vignette + layer.adjustments.dehaze + layer.filters.cinematic) / 260);
  return `<g transform="${svgTransform(layer)}" opacity="${opacity}"><rect width="${layer.width}" height="${layer.height}" fill="rgba(9,12,18,0.24)"/></g>`;
}

export function renderStudioProjectSvg(project: StudioProject, options?: { hideSelection?: boolean }) {
  const bg = project.canvas.transparent ? 'transparent' : project.canvas.background;
  const layerMarkup = project.layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      if (layer.kind === 'text') return renderTextLayer(layer);
      if (layer.kind === 'shape') return renderShapeLayer(layer);
      if (layer.kind === 'image' || layer.kind === 'ai') return renderImageLayer(layer);
      if (layer.kind === 'adjustment') return renderAdjustmentLayer(layer);
      return '';
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${project.canvas.width}" height="${project.canvas.height}" viewBox="0 0 ${project.canvas.width} ${project.canvas.height}">
      <rect width="100%" height="100%" fill="${bg}" />
      ${layerMarkup}
      ${options?.hideSelection ? '' : ''}
    </svg>
  `.trim();
}

export async function rasterizeStudioSvg(svg: string, width: number, height: number, mimeType: 'image/png' | 'image/jpeg' | 'image/webp', quality = 0.92) {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Thumbnail Studio could not render the SVG export frame.'));
      img.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas export context could not be created.');
    if (mimeType === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
    if (!blob) throw new Error('Thumbnail Studio could not create the requested export blob.');
    return await blob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function buildPdfFromStudioProject(svg: string, width: number, height: number) {
  const jpegBuffer = await rasterizeStudioSvg(svg, width, height, 'image/jpeg', 0.94);
  const jpegBytes = new Uint8Array(jpegBuffer);
  const objects: string[] = [];
  const offsets: number[] = [0];
  const pointsWidth = (width / 96) * 72;
  const pointsHeight = (height / 96) * 72;

  const pushObject = (content: string) => {
    offsets.push(objects.join('').length);
    objects.push(content);
  };

  pushObject(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  pushObject(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
  pushObject(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pointsWidth.toFixed(2)} ${pointsHeight.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  pushObject(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n${String.fromCharCode(...jpegBytes)}\nendstream\nendobj\n`);
  pushObject(`5 0 obj\n<< /Length 43 >>\nstream\nq\n${pointsWidth.toFixed(2)} 0 0 ${pointsHeight.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\nendstream\nendobj\n`);

  const header = '%PDF-1.4\n';
  let body = '';
  const xrefOffsets: number[] = [0];
  objects.forEach((object) => {
    xrefOffsets.push(header.length + body.length);
    body += object;
  });
  const xrefStart = header.length + body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  xrefOffsets.slice(1).forEach((offset) => {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(header + body + xref + trailer).buffer;
}
