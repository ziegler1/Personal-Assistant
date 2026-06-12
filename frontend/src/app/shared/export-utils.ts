import type { Content } from 'pdfmake/build/pdfmake';
import { GeneratedOutput } from '../core/models/note.model';

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'checklist'; items: string[] };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const CHECKLIST_RE = /^[-*]\s+\[( |x|X)\]\s+(.*)$/;
const BULLET_RE = /^[-*]\s+(.*)$/;
const NUMBERED_RE = /^\d+[.)]\s+(.*)$/;

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = HEADING_RE.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }

    const checklist = CHECKLIST_RE.exec(line);
    if (checklist) {
      const text = `${checklist[1].toLowerCase() === 'x' ? '☑' : '☐'} ${checklist[2]}`;
      const last = blocks[blocks.length - 1];
      if (last?.type === 'checklist') last.items.push(text);
      else blocks.push({ type: 'checklist', items: [text] });
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ul') last.items.push(bullet[1]);
      else blocks.push({ type: 'ul', items: [bullet[1]] });
      continue;
    }

    const numbered = NUMBERED_RE.exec(line);
    if (numbered) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ol') last.items.push(numbered[1]);
      else blocks.push({ type: 'ol', items: [numbered[1]] });
      continue;
    }

    const last = blocks[blocks.length - 1];
    if (last?.type === 'paragraph') last.text += ` ${line}`;
    else blocks.push({ type: 'paragraph', text: line });
  }

  return blocks;
}

function markdownToPdfContent(markdown: string): Content[] {
  return parseMarkdown(markdown).map((block): Content => {
    switch (block.type) {
      case 'heading':
        return { text: block.text, style: block.level <= 2 ? 'h1' : 'h2', margin: [0, 10, 0, 4] };
      case 'ul':
        return { ul: block.items, margin: [0, 0, 0, 8] };
      case 'ol':
        return { ol: block.items, margin: [0, 0, 0, 8] };
      case 'checklist':
        return { stack: block.items.map((item) => ({ text: item, margin: [0, 2, 0, 2] })) };
      default:
        return { text: block.text, margin: [0, 0, 0, 8] };
    }
  });
}

let pdfMakeLoader: Promise<typeof import('pdfmake/build/pdfmake')> | undefined;

async function loadPdfMake(): Promise<typeof import('pdfmake/build/pdfmake')> {
  if (!pdfMakeLoader) {
    pdfMakeLoader = (async () => {
      const [pdfMakeModule, vfsModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
      ]);
      const pdfMake =
        (pdfMakeModule as unknown as { default?: typeof pdfMakeModule }).default ?? pdfMakeModule;
      const vfs = (vfsModule as unknown as { default?: object }).default ?? vfsModule;
      pdfMake.addVirtualFileSystem(vfs as Parameters<typeof pdfMake.addVirtualFileSystem>[0]);
      return pdfMake;
    })();
  }
  return pdfMakeLoader;
}

export async function createGeneratedPdf(output: GeneratedOutput, diagramImage?: string) {
  const pdfMake = await loadPdfMake();

  const content: Content[] = [{ text: output.title, style: 'title', margin: [0, 0, 0, 12] }];
  if (output.format === 'workflow-diagram' && diagramImage) {
    content.push({ image: diagramImage, width: 480, margin: [0, 0, 0, 12] });
  } else {
    content.push(...markdownToPdfContent(output.content));
  }

  return pdfMake.createPdf({
    content,
    styles: {
      title: { fontSize: 18, bold: true },
      h1: { fontSize: 15, bold: true },
      h2: { fontSize: 13, bold: true },
    },
    defaultStyle: { fontSize: 11 },
  });
}

export async function renderMermaidSvg(definition: string): Promise<string> {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false });
  const id = `mermaid-${Math.random().toString(36).slice(2)}`;
  const { svg } = await mermaid.render(id, definition);
  return svg;
}

export function svgToPngDataUrl(svg: string, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load diagram SVG'));
    };
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function noteCardToPngDataUrl(title: string, markdown: string): string {
  const lines = parseMarkdown(markdown).flatMap((block) => {
    if (block.type === 'heading' || block.type === 'paragraph') return [block.text];
    return block.items.map((item) => `• ${item}`);
  });

  const width = 800;
  const padding = 40;
  const titleSize = 28;
  const bodySize = 18;
  const lineHeight = 28;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.font = `${bodySize}px sans-serif`;
  const maxWidth = width - padding * 2;
  const wrapped = lines.flatMap((line) => wrapText(ctx, line, maxWidth));

  canvas.width = width;
  canvas.height = padding * 2 + titleSize + 30 + wrapped.length * lineHeight;

  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold ${titleSize}px sans-serif`;
  ctx.fillText(title, padding, padding + titleSize - 4);

  ctx.font = `${bodySize}px sans-serif`;
  ctx.fillStyle = '#cbd5e1';
  wrapped.forEach((line, i) => {
    ctx.fillText(line, padding, padding + titleSize + 30 + i * lineHeight);
  });

  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
