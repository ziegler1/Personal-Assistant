import { pool } from '../db/pool';
import { getEmbeddingProvider } from '../ai';
import { ContentType, FileRecord, Note, NoteWithFiles, SearchResult } from '../types/models';

const NOTE_COLUMNS = 'id, title, content, content_type, source, tags, category, subcategory, created_at, updated_at';

export interface CreateNoteInput {
  title: string;
  content?: string;
  content_type?: ContentType;
  source?: string | null;
  tags?: string[];
  category?: string | null;
  subcategory?: string | null;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  content_type?: ContentType;
  source?: string | null;
  tags?: string[];
  category?: string | null;
  subcategory?: string | null;
}

export interface ListNotesFilter {
  tag?: string;
  contentType?: ContentType;
  category?: string;
}

export interface SearchNotesOptions extends ListNotesFilter {
  limit?: number;
  minScore?: number;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

// Embedding providers cap input size (e.g. Cohere embed-english-v3.0 accepts
// ~512 tokens per text). Notes can be much longer than that, so embed only
// the first chunk - the full text is always stored in the `content` column
// regardless of this truncation.
const EMBED_MAX_CHARS = 2000;

async function embedText(text: string): Promise<string | null> {
  try {
    const chunk = text.length > EMBED_MAX_CHARS ? text.slice(0, EMBED_MAX_CHARS) : text;
    const embedding = await getEmbeddingProvider().embed(chunk);
    return toVectorLiteral(embedding);
  } catch (err) {
    console.error('Embedding generation failed:', err);
    return null;
  }
}

export async function listTags(): Promise<string[]> {
  const { rows } = await pool.query<{ tag: string }>(
    `SELECT DISTINCT unnest(tags) AS tag FROM notes ORDER BY tag`
  );
  return rows.map((r) => r.tag);
}

export async function listNotes(filter: ListNotesFilter = {}): Promise<Note[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.tag) {
    params.push(filter.tag);
    conditions.push(`$${params.length} = ANY(tags)`);
  }
  if (filter.contentType) {
    params.push(filter.contentType);
    conditions.push(`content_type = $${params.length}`);
  }
  if (filter.category) {
    params.push(filter.category);
    conditions.push(`category = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<Note>(
    `SELECT ${NOTE_COLUMNS} FROM notes ${where} ORDER BY updated_at DESC`,
    params
  );
  return rows;
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const title = input.title?.trim();
  if (!title) {
    throw Object.assign(new Error('title is required'), { status: 400 });
  }
  const content = input.content ?? '';
  const embedding = await embedText(`${title}\n\n${content}`);

  const { rows } = await pool.query<Note>(
    `INSERT INTO notes (title, content, content_type, source, tags, category, subcategory, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${NOTE_COLUMNS}`,
    [title, content, input.content_type || 'text', input.source ?? null, input.tags ?? [], input.category ?? null, input.subcategory ?? null, embedding]
  );
  return rows[0];
}

export async function getNoteById(id: string): Promise<NoteWithFiles | null> {
  const { rows } = await pool.query<Note>(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id = $1`, [id]);
  if (!rows.length) return null;

  const { rows: files } = await pool.query<FileRecord>(
    `SELECT id, note_id, r2_key, filename, mime_type, size_bytes, extraction_status, created_at
     FROM files WHERE note_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  return { ...rows[0], files };
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note | null> {
  const existing = await pool.query<Note>(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id = $1`, [id]);
  if (!existing.rows.length) return null;
  const current = existing.rows[0];

  const title = input.title !== undefined ? input.title.trim() : current.title;
  const content = input.content !== undefined ? input.content : current.content;
  const contentType = input.content_type ?? current.content_type;
  const source = input.source !== undefined ? input.source : current.source;
  const tags = input.tags ?? current.tags;
  const category = input.category !== undefined ? input.category : current.category;
  const subcategory = input.subcategory !== undefined ? input.subcategory : current.subcategory;

  const contentChanged = title !== current.title || content !== current.content;
  const embedding = contentChanged ? await embedText(`${title}\n\n${content}`) : undefined;

  const { rows } = await pool.query<Note>(
    `UPDATE notes
     SET title = $1, content = $2, content_type = $3, source = $4, tags = $5,
         category = $6, subcategory = $7, embedding = COALESCE($8, embedding)
     WHERE id = $9
     RETURNING ${NOTE_COLUMNS}`,
    [title, content, contentType, source, tags, category, subcategory, embedding ?? null, id]
  );
  return rows[0];
}

export async function deleteNote(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function searchNotes(query: string, opts: SearchNotesOptions = {}): Promise<SearchResult[]> {
  const limit = opts.limit ?? 20;

  let queryEmbedding: string | null = null;
  try {
    const embedding = await getEmbeddingProvider().embed(query);
    queryEmbedding = toVectorLiteral(embedding);
  } catch (err) {
    console.error('Query embedding failed, falling back to full-text search only:', err);
  }

  const params: unknown[] = [query];
  const tsParam = 1;

  let vectorParam: number | null = null;
  if (queryEmbedding) {
    params.push(queryEmbedding);
    vectorParam = params.length;
  }

  const conditions: string[] = [];
  if (opts.tag) {
    params.push(opts.tag);
    conditions.push(`$${params.length} = ANY(tags)`);
  }
  if (opts.contentType) {
    params.push(opts.contentType);
    conditions.push(`content_type = $${params.length}`);
  }
  if (opts.category) {
    params.push(opts.category);
    conditions.push(`category = $${params.length}`);
  }
  const extraWhere = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  const textScoreExpr = `ts_rank_cd(search_vector, plainto_tsquery('english', $${tsParam}))`;
  const vectorScoreExpr = vectorParam
    ? `GREATEST(0, 1 - (embedding <=> $${vectorParam}::vector))`
    : '0';

  const sql = `
    SELECT ${NOTE_COLUMNS},
      ${textScoreExpr} AS text_score,
      (${vectorScoreExpr}) AS vector_score,
      (${textScoreExpr} * 0.4 + (${vectorScoreExpr}) * 0.6) AS score,
      ts_headline('english', content, plainto_tsquery('english', $${tsParam}),
        'MaxFragments=1, MaxWords=35, MinWords=10') AS snippet
    FROM notes
    WHERE (${textScoreExpr} > 0 ${vectorParam ? `OR (${vectorScoreExpr}) > 0.3` : ''})
    ${extraWhere}
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  const { rows } = await pool.query<SearchResult>(sql, params);

  const minScore = opts.minScore ?? 0;
  return rows.filter((r) => r.score >= minScore);
}
