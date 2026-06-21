export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
}

export type ToolExecutor = (toolName: string) => Promise<string>;

export interface AIProvider {
  embed(text: string): Promise<number[]>;
  chat(messages: Message[], context: string[], tools?: ToolDefinition[], executor?: ToolExecutor): Promise<string>;
  generate(prompt: string): Promise<string>;
}

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  raw_content: string;
}

export interface WebSearchResponse {
  answer: string | null;
  results: WebSearchResult[];
}

export interface WebSearchProvider {
  webSearch(query: string): Promise<WebSearchResponse>;
}
