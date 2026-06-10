import { pool } from '../db/pool';
import { getChatProvider, getEmbeddingProvider, Message } from '../ai';

export interface ChatSource {
  id: string;
  title: string;
}

export interface ChatResult {
  reply: string;
  sources: ChatSource[];
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

const SIMILARITY_THRESHOLD = 0.2;
const MAX_SOURCES = 5;

export async function chat(messages: Message[]): Promise<ChatResult> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  let sources: { id: string; title: string; content: string }[] = [];

  if (lastUser) {
    try {
      const embedding = await getEmbeddingProvider().embed(lastUser.content);
      const { rows } = await pool.query<{ id: string; title: string; content: string; similarity: number }>(
        `SELECT id, title, content, 1 - (embedding <=> $1::vector) AS similarity
         FROM notes
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [toVectorLiteral(embedding), MAX_SOURCES]
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
