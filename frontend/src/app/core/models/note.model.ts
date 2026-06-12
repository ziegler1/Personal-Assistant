export type ContentType = 'text' | 'code' | 'chat' | 'file' | 'link';

export const CONTENT_TYPES: ContentType[] = ['text', 'code', 'chat', 'file', 'link'];

export type ExtractionStatus = 'success' | 'empty' | 'error';

export interface Note {
  id: string;
  title: string;
  content: string;
  content_type: ContentType;
  source: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface NoteFile {
  id: string;
  note_id: string | null;
  r2_key: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  extraction_status: ExtractionStatus | null;
  created_at: string;
  note_title?: string;
}

export interface NoteWithFiles extends Note {
  files: NoteFile[];
}

export interface SearchResult extends Note {
  score: number;
  text_score: number;
  vector_score: number;
  snippet: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatSource {
  id: string;
  title: string;
}

export interface ChatWebResult {
  title: string;
  url: string;
  content: string;
  raw_content: string;
}

export interface ChatResponse {
  reply: string;
  sources: ChatSource[];
  webResults: ChatWebResult[];
  webSearchAnswer: string | null;
  webSearchQuery: string | null;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[] | null;
  web_results: ChatWebResult[] | null;
  web_search_answer: string | null;
  web_search_query: string | null;
  created_at: string;
}

export type GenerateFormat = 'note-card' | 'workflow-diagram' | 'markdown-doc' | 'checklist';

export const GENERATE_FORMATS: { value: GenerateFormat; label: string }[] = [
  { value: 'note-card', label: 'Note card' },
  { value: 'workflow-diagram', label: 'Workflow diagram' },
  { value: 'markdown-doc', label: 'Markdown doc' },
  { value: 'checklist', label: 'Checklist' },
];

export interface GeneratedOutput {
  format: GenerateFormat;
  title: string;
  content: string;
}
