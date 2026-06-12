import { pool } from '../db/pool';
import { getChatProvider, getEmbeddingProvider, Message } from '../ai';
import { ContentType } from '../types/models';

export interface ChatSource {
  id: string;
  title: string;
}

export interface ChatResult {
  reply: string;
  sources: ChatSource[];
}

export interface ChatOptions {
  contentType?: ContentType;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[] | null;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

const SIMILARITY_THRESHOLD = 0.2;
const MAX_SOURCES = 5;

export async function chat(messages: Message[], opts: ChatOptions = {}): Promise<ChatResult> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  let sources: { id: string; title: string; content: string }[] = [];

  if (lastUser) {
    try {
      const embedding = await getEmbeddingProvider().embed(lastUser.content);
      const params: unknown[] = [toVectorLiteral(embedding)];
      let where = 'embedding IS NOT NULL';
      if (opts.contentType) {
        params.push(opts.contentType);
        where += ` AND content_type = $${params.length}`;
      }
      params.push(MAX_SOURCES);

      const { rows } = await pool.query<{ id: string; title: string; content: string; similarity: number }>(
        `SELECT id, title, content, 1 - (embedding <=> $1::vector) AS similarity
         FROM notes
         WHERE ${where}
         ORDER BY embedding <=> $1::vector
         LIMIT $${params.length}`,
        params
      );
      sources = rows.filter((r) => r.similarity > SIMILARITY_THRESHOLD);
    } catch (err) {
      console.error('Note retrieval for chat failed:', err);
    }
  }

  const context = sources.map((s) => `### ${s.title}\n${s.content}`);
  const reply = await getChatProvider().chat(messages, context);

  return {
    reply,
    sources: sources.map((s) => ({ id: s.id, title: s.title })),
  };
}

export async function saveMessage(
  role: 'user' | 'assistant',
  content: string,
  sources?: ChatSource[]
): Promise<void> {
  await pool.query(
    `INSERT INTO chat_messages (role, content, sources) VALUES ($1, $2, $3)`,
    [role, content, sources && sources.length ? JSON.stringify(sources) : null]
  );
}

export async function getRecentMessages(limit = 20): Promise<ChatHistoryMessage[]> {
  const { rows } = await pool.query<ChatHistoryMessage>(
    `SELECT role, content, sources FROM chat_messages ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.reverse();
}
