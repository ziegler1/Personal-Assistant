import { pool } from '../db/pool';
import { getChatProvider, getEmbeddingProvider, getWebSearchProvider, Message } from '../ai';
import { config } from '../config';
import { ContentType } from '../types/models';
import { NO_TEXT_EXTRACTED_PREFIX } from './ingestionService';
import { buildCollectionTools, executeCollectionTool } from '../ai/tools/collectionsTool';

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

export interface ChatResult {
  reply: string;
  sources: ChatSource[];
  webResults: ChatWebResult[];
  webSearchAnswer: string | null;
  webSearchQuery: string | null;
}

export interface ChatOptions {
  contentType?: ContentType;
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

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

const SIMILARITY_THRESHOLD = 0.2;
const WEB_SEARCH_SIMILARITY_THRESHOLD = 0.5;
const MAX_SOURCES = 10;
const SEARCH_PREFIX_RE = /^\s*search:\s*/i;
const LIST_ALL_RE = /\b(list|all|how many|what do you have)\b/i;

export async function chat(messages: Message[], opts: ChatOptions = {}): Promise<ChatResult> {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
  const lastUser = lastUserIndex >= 0 ? messages[lastUserIndex] : undefined;

  let sources: { id: string; title: string; content: string; content_type: ContentType; filename: string | null }[] =
    [];
  let webResults: ChatWebResult[] = [];
  let webSearchAnswer: string | null = null;
  let webSearchQuery: string | null = null;
  let providerMessages = messages;
  let allTitles: string[] | null = null;

  if (lastUser) {
    const forceWebSearch = SEARCH_PREFIX_RE.test(lastUser.content);
    const query = lastUser.content.replace(SEARCH_PREFIX_RE, '').trim();

    if (forceWebSearch) {
      providerMessages = messages.map((m, i) => (i === lastUserIndex ? { ...m, content: query } : m));
    }

    let topSimilarity = 0;

    if (!forceWebSearch && LIST_ALL_RE.test(query)) {
      try {
        const params: unknown[] = [];
        let where = '';
        if (opts.contentType) {
          params.push(opts.contentType);
          where = ` WHERE content_type = $${params.length}`;
        }
        const { rows } = await pool.query<{ title: string }>(
          `SELECT title FROM notes${where} ORDER BY created_at DESC`,
          params
        );
        allTitles = rows.map((r) => r.title);
        topSimilarity = 1;
      } catch (err) {
        console.error('Note title listing for chat failed:', err);
      }
    }

    if (allTitles === null) {
      try {
        const embedding = await getEmbeddingProvider().embed(query);
        const params: unknown[] = [toVectorLiteral(embedding)];
        let where = 'n.embedding IS NOT NULL';
        if (opts.contentType) {
          params.push(opts.contentType);
          where += ` AND n.content_type = $${params.length}`;
        }
        params.push(`${NO_TEXT_EXTRACTED_PREFIX}%`);
        const stubParam = params.length;
        params.push(MAX_SOURCES);

        const { rows } = await pool.query<{
          id: string;
          title: string;
          content: string;
          content_type: ContentType;
          filename: string | null;
          similarity: number;
        }>(
          `SELECT n.id, n.title, n.content, n.content_type,
                  (SELECT f.filename FROM files f WHERE f.note_id = n.id LIMIT 1) AS filename,
                  1 - (n.embedding <=> $1::vector) AS similarity
           FROM notes n
           WHERE ${where}
           ORDER BY (n.content_type = 'file' AND n.content LIKE $${stubParam}) ASC,
                    n.embedding <=> $1::vector
           LIMIT $${params.length}`,
          params
        );
        topSimilarity = rows[0]?.similarity ?? 0;
        sources = rows.filter((r) => r.similarity > SIMILARITY_THRESHOLD);
      } catch (err) {
        console.error('Note retrieval for chat failed:', err);
      }
    }

    if (query && (forceWebSearch || topSimilarity < WEB_SEARCH_SIMILARITY_THRESHOLD)) {
      try {
        const searchResponse = await getWebSearchProvider().webSearch(query);
        webResults = searchResponse.results;
        webSearchAnswer = searchResponse.answer;
        webSearchQuery = query;
      } catch (err) {
        console.error('Web search failed:', err);
      }
    }

  }

  const context = [
    ...(allTitles
      ? [`### All your notes (${allTitles.length})\n${allTitles.map((t) => `- ${t}`).join('\n')}`]
      : []),
    ...sources.map((s) => {
      if (s.content_type === 'file' && s.content.startsWith(NO_TEXT_EXTRACTED_PREFIX)) {
        return `### ${s.title}\n[File: ${s.filename ?? s.title} — no extractable text]`;
      }
      return `### ${s.title}\n${s.content}`;
    }),
    ...webResults.map((r) => `### ${r.title} (${r.url})\n${r.content}`),
  ];
  const collectionTools = buildCollectionTools();
  const reply = await getChatProvider().chat(providerMessages, context, collectionTools, executeCollectionTool);

  return {
    reply,
    sources: sources.map((s) => ({ id: s.id, title: s.title })),
    webResults,
    webSearchAnswer,
    webSearchQuery,
  };
}

export async function saveMessage(
  role: 'user' | 'assistant',
  content: string,
  sources?: ChatSource[],
  webResults?: ChatWebResult[],
  webSearchAnswer?: string | null,
  webSearchQuery?: string | null
): Promise<void> {
  await pool.query(
    `INSERT INTO chat_messages (role, content, sources, web_results, web_search_answer, web_search_query)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      role,
      content,
      sources && sources.length ? JSON.stringify(sources) : null,
      webResults && webResults.length ? JSON.stringify(webResults) : null,
      webSearchAnswer ?? null,
      webSearchQuery ?? null,
    ]
  );

  await pool.query(
    `DELETE FROM chat_messages WHERE id NOT IN (SELECT id FROM chat_messages ORDER BY created_at DESC LIMIT $1)`,
    [config.chatHistoryLimit]
  );
}

export async function getRecentMessages(limit = 20): Promise<ChatHistoryMessage[]> {
  const { rows } = await pool.query<ChatHistoryMessage>(
    `SELECT role, content, sources, web_results, web_search_answer, web_search_query, created_at
     FROM chat_messages ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.reverse();
}
