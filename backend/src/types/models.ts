export type ContentType = 'text' | 'code' | 'chat' | 'file' | 'link';

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

export interface NoteWithFiles extends Note {
  files: FileRecord[];
}

export interface SearchResult extends Note {
  score: number;
  text_score: number;
  vector_score: number;
  snippet: string;
}

export interface FileRecord {
  id: string;
  note_id: string | null;
  r2_key: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  extraction_status: ExtractionStatus | null;
  created_at: string;
}
