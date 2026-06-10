export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface AIProvider {
  embed(text: string): Promise<number[]>;
  chat(messages: Message[], context: string[]): Promise<string>;
}
