import { pool } from '../db/pool';
import { getChatProvider, getEmbeddingProvider, getWebSearchProvider, Message } from '../ai';
import { ContentType } from '../types/models';

export interface ChatSource {
  id: string;
  title: string;
}

export interface ChatWebResult {
  title: string;
  url: string;
  content: string;
}

export interface ChatResult {
  reply: string;
  sources: ChatSource[];
  webResults: ChatWebResult[];
}

export interface ChatOptions {
  contentType?: ContentType;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[] | null;
  web_results: ChatWebResult[] | null;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

const SIMILARITY_THRESHOLD = 0.2;
const WEB_SEARCH_SIMILARITY_THRESHOLD = 0.5;
const MAX_SOURCES = 5;
const SEARCH_PREFIX_RE = /^\s*search:\s*/i;

export async function chat(messages: Message[], opts: ChatOptions = {}): Promise<ChatResult> {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
  const lastUser = lastUserIndex >= 0 ? messages[lastUserIndex] : undefined;

  let sources: { id: string; title: string; content: string }[] = [];
  let webResults: ChatWebResult[] = [];
  let providerMessages = messages;

  if (lastUser) {
    const forceWebSearch = SEARCH_PREFIX_RE.test(lastUser.content);
    const query = lastUser.content.replace(SEARCH_PREFIX_RE, '').trim();

    if (forceWebSearch) {
      providerMessages = messages.map((m, i) => (i === lastUserIndex ? { ...m, content: query } : m));
    }

    let topSimilarity = 0;
    try {
      const embedding = await getEmbeddingProvider().embed(query);
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
      topSimilarity = rows[0]?.similarity ?? 0;
      sources = rows.filter((r) => r.similarity > SIMILARITY_THRESHOLD);
    } catch (err) {
      console.error('Note retrieval for chat failed:', err);
    }

    if (query && (forceWebSearch || topSimilarity < WEB_SEARCH_SIMILARITY_THRESHOLD)) {
      try {
        webResults = await getWebSearchProvider().webSearch(query);
      } catch (err) {
        console.error('Web search failed:', err);
      }
    }
  }

  const context = [
    ...sources.map((s) => `### ${s.title}\n${s.content}`),
    ...webResults.map((r) => `### ${r.title} (${r.url})\n${r.content}`),
  ];
  const reply = await getChatProvider().chat(providerMessages, context);

  return {
    reply,
    sources: sources.map((s) => ({ id: s.id, title: s.title })),
    webResults,
  };
}

export async function saveMessage(
  role: 'user' | 'assistant',
  content: string,
  sources?: ChatSource[],
  webResults?: ChatWebResult[]
): Promise<void> {
  await pool.query(
    `INSERT INTO chat_messages (role, content, sources, web_results) VALUES ($1, $2, $3, $4)`,
    [
      role,
      content,
      sources && sources.length ? JSON.stringify(sources) : null,
      webResults && webResults.length ? JSON.stringify(webResults) : null,
    ]
  );
}

export async function getRecentMessages(limit = 20): Promise<ChatHistoryMessage[]> {
  const { rows } = await pool.query<ChatHistoryMessage>(
    `SELECT role, content, sources, web_results FROM chat_messages ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.reverse();
}
