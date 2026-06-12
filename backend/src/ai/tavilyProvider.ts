import { config } from '../config';
import { WebSearchProvider, WebSearchResult } from './types';

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const MAX_RESULTS = 5;

interface TavilySearchResponse {
  results: { title: string; url: string; content: string }[];
}

export class TavilyProvider implements WebSearchProvider {
  async webSearch(query: string): Promise<WebSearchResult[]> {
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
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as TavilySearchResponse;
    return data.results.map((r) => ({ title: r.title, url: r.url, content: r.content }));
  }
}
