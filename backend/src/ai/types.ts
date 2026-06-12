export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface AIProvider {
  embed(text: string): Promise<number[]>;
  chat(messages: Message[], context: string[]): Promise<string>;
  generate(prompt: string): Promise<string>;
}

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface WebSearchProvider {
  webSearch(query: string): Promise<WebSearchResult[]>;
}
