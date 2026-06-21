import { config } from '../../config';
import { ToolDefinition } from '../types';

export interface BookSummary {
  id: number;
  title: string;
  author: string | null;
  series: string | null;
  status: string;
  rating: number | null;
}

export interface BourbonSummary {
  id: string;
  name: string;
  distillery: string | null;
  type: string | null;
  proof: number | null;
  rating: number | null;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall_notes: string | null;
  would_buy_again: boolean | null;
}

const FETCH_TIMEOUT_MS = 5_000;

async function safeFetch<T>(url: string, key: string, label: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'X-Internal-Key': key },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[collections] ${label} returned HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[collections] ${label} failed:`, err);
    return null;
  }
}

/** Get the user's full sci-fi/fantasy reading list. */
export async function getBooks(): Promise<BookSummary[]> {
  if (!config.codexApiUrl || !config.codexInternalKey) return [];
  const data = await safeFetch<{ books: BookSummary[] }>(
    `${config.codexApiUrl}/api/internal/books`,
    config.codexInternalKey,
    'get_books',
  );
  return data?.books ?? [];
}

/** Get the user's 10 most recently added books. */
export async function getRecentBooks(): Promise<BookSummary[]> {
  if (!config.codexApiUrl || !config.codexInternalKey) return [];
  const data = await safeFetch<{ books: BookSummary[] }>(
    `${config.codexApiUrl}/api/internal/books/recent`,
    config.codexInternalKey,
    'get_recent_books',
  );
  return data?.books ?? [];
}

/** Get the user's full bourbon/whiskey collection. */
export async function getBourbons(): Promise<BourbonSummary[]> {
  if (!config.cheersApiUrl || !config.cheersInternalKey) return [];
  const data = await safeFetch<{ bourbons: BourbonSummary[] }>(
    `${config.cheersApiUrl}/api/internal/bourbons`,
    config.cheersInternalKey,
    'get_bourbons',
  );
  return data?.bourbons ?? [];
}

/** Get the user's top-rated bourbons (rating >= 4), sorted best first. */
export async function getTopBourbons(): Promise<BourbonSummary[]> {
  if (!config.cheersApiUrl || !config.cheersInternalKey) return [];
  const data = await safeFetch<{ bourbons: BourbonSummary[] }>(
    `${config.cheersApiUrl}/api/internal/bourbons/top-rated`,
    config.cheersInternalKey,
    'get_top_bourbons',
  );
  return data?.bourbons ?? [];
}

function formatBooks(books: BookSummary[], label: string): string {
  const lines = books.map((b) => {
    const parts: string[] = [`"${b.title}"`];
    if (b.author) parts.push(`by ${b.author}`);
    if (b.series) parts.push(`(${b.series})`);
    parts.push(`— ${b.status}`);
    if (b.rating != null) parts.push(`★ ${b.rating}/5`);
    return `- ${parts.join(' ')}`;
  });
  return `### Your Reading List (${label})\n${lines.join('\n')}`;
}

function formatBourbons(bourbons: BourbonSummary[], label: string): string {
  const lines = bourbons.map((b) => {
    const header: string[] = [b.name];
    if (b.distillery) header.push(b.distillery);
    if (b.proof != null) header.push(`${b.proof} proof`);
    if (b.rating != null) header.push(`Rating: ${b.rating}/10`);
    const notes: string[] = [];
    if (b.nose) notes.push(`Nose: ${b.nose}`);
    if (b.palate) notes.push(`Palate: ${b.palate}`);
    if (b.finish) notes.push(`Finish: ${b.finish}`);
    if (b.overall_notes) notes.push(`Notes: ${b.overall_notes}`);
    if (b.would_buy_again != null) notes.push(`Would buy again: ${b.would_buy_again ? 'Yes' : 'No'}`);
    return notes.length
      ? `- ${header.join(' | ')}\n  ${notes.join(' | ')}`
      : `- ${header.join(' | ')}`;
  });
  return `### Your Bourbon Collection (${label})\n${lines.join('\n')}`;
}

/** Executes a named collection tool and returns a formatted string for Claude. */
export async function executeCollectionTool(toolName: string): Promise<string> {
  switch (toolName) {
    case 'get_books': {
      const books = await getBooks();
      return books.length > 0
        ? formatBooks(books, 'get_books')
        : 'Your book collection could not be reached right now.';
    }
    case 'get_recent_books': {
      const books = await getRecentBooks();
      return books.length > 0
        ? formatBooks(books, 'get_recent_books')
        : 'Your book collection could not be reached right now.';
    }
    case 'get_bourbons': {
      const bourbons = await getBourbons();
      return bourbons.length > 0
        ? formatBourbons(bourbons, 'get_bourbons')
        : 'Your bourbon collection could not be reached right now.';
    }
    case 'get_top_bourbons': {
      const bourbons = await getTopBourbons();
      return bourbons.length > 0
        ? formatBourbons(bourbons, 'get_top_bourbons')
        : 'Your bourbon collection could not be reached right now.';
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}

/** Tool definitions passed to the AI provider — only register tools whose backing service is configured. */
export function buildCollectionTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  if (config.codexApiUrl && config.codexInternalKey) {
    tools.push(
      {
        name: 'get_books',
        description: "Get the user's full sci-fi/fantasy reading list, including title, author, series, reading status, and rating.",
      },
      {
        name: 'get_recent_books',
        description: "Get the user's 10 most recently added or updated books.",
      },
    );
  }
  if (config.cheersApiUrl && config.cheersInternalKey) {
    tools.push(
      {
        name: 'get_bourbons',
        description: "Get the user's full bourbon/whiskey collection with ratings, tasting notes (nose, palate, finish), and distillery info.",
      },
      {
        name: 'get_top_bourbons',
        description: "Get the user's top-rated bourbons (rating 4 or higher), sorted best first.",
      },
    );
  }
  return tools;
}
