import { config } from '../config';
import { WebSearchProvider, WebSearchResponse } from './types';

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const MAX_RESULTS = 5;

interface TavilySearchResponse {
  answer?: string;
  results: { title: string; url: string; content: string; raw_content?: string }[];
}

export class TavilyProvider implements WebSearchProvider {
  async webSearch(query: string): Promise<WebSearchResponse> {
    if (!config.tavilyApiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    const response = await fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.tavilyApiKey,
        query,
        max_results: MAX_RESULTS,
        include_answer: true,
        include_raw_content: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as TavilySearchResponse;
    return {
      answer: data.answer ?? null,
      results: data.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        raw_content: r.raw_content ?? r.content,
      })),
    };
  }
}
