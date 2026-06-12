import { getChatProvider } from '../ai';

export type GenerateFormat = 'note-card' | 'workflow-diagram' | 'markdown-doc' | 'checklist';

export const GENERATE_FORMATS: GenerateFormat[] = ['note-card', 'workflow-diagram', 'markdown-doc', 'checklist'];

export interface GeneratedOutput {
  format: GenerateFormat;
  title: string;
  content: string;
}

const RESPONSE_FORMAT_INSTRUCTIONS =
  'Respond in exactly this format, with nothing before or after it:\n' +
  'TITLE: <a short title, no more than 8 words>\n' +
  '---\n' +
  '<the generated content>';

const FORMAT_PROMPTS: Record<GenerateFormat, string> = {
  'note-card':
    'Summarize the following text as a concise note card: a short title and a bulleted list of the ' +
    'key points (as Markdown). Keep it brief and scannable.\n\n' +
    RESPONSE_FORMAT_INSTRUCTIONS +
    '\n\nText:\n',
  'workflow-diagram':
    'Read the following text and produce a Mermaid flowchart (using "flowchart TD") that represents it as a ' +
    'step-by-step workflow or process. Output ONLY raw Mermaid syntax as the content - do not wrap it in ' +
    'Markdown code fences (no ``` characters) and do not include any explanation.\n\n' +
    RESPONSE_FORMAT_INSTRUCTIONS +
    '\n\nText:\n',
  'markdown-doc':
    'Rewrite the following text as a well-structured Markdown document with headings, paragraphs, and lists ' +
    'where appropriate.\n\n' +
    RESPONSE_FORMAT_INSTRUCTIONS +
    '\n\nText:\n',
  checklist:
    'Extract an actionable checklist of steps or tasks from the following text. Format the content as a ' +
    'Markdown checklist using "- [ ] " for each item, in the order they should be done.\n\n' +
    RESPONSE_FORMAT_INSTRUCTIONS +
    '\n\nText:\n',
};

const CODE_FENCE_RE = /^```[a-z]*\n([\s\S]*?)\n```$/i;
const TITLE_LINE_RE = /^TITLE:\s*(.+)$/m;
const SEPARATOR_RE = /^---\s*$/m;

function parseResponse(format: GenerateFormat, raw: string): GeneratedOutput {
  const trimmed = raw.trim();
  const titleMatch = TITLE_LINE_RE.exec(trimmed);
  const separatorMatch = SEPARATOR_RE.exec(trimmed);

  let title: string;
  let content: string;

  if (titleMatch && separatorMatch && separatorMatch.index > titleMatch.index) {
    title = titleMatch[1].trim();
    content = trimmed.slice(separatorMatch.index + separatorMatch[0].length).trim();
  } else {
    title = `Generated ${format.replace('-', ' ')}`;
    content = trimmed;
  }

  if (format === 'workflow-diagram') {
    const fenceMatch = CODE_FENCE_RE.exec(content);
    if (fenceMatch) {
      content = fenceMatch[1].trim();
    }
  }

  return { format, title, content };
}

export async function generate(format: GenerateFormat, sourceText: string): Promise<GeneratedOutput> {
  const prompt = FORMAT_PROMPTS[format] + sourceText;
  const raw = await getChatProvider().generate(prompt);
  return parseResponse(format, raw);
}
