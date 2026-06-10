export type ContentType = 'text' | 'code' | 'chat' | 'file' | 'link';

export const CONTENT_TYPES: ContentType[] = ['text', 'code', 'chat', 'file', 'link'];

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

export interface ChatResponse {
  reply: string;
  sources: ChatSource[];
}
