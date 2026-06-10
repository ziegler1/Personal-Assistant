import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { AIProvider, Message } from './types';
import { buildSystemPrompt } from './systemPrompt';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      'ClaudeProvider does not support embeddings. AI_PROVIDER=claude pairs Claude (chat) with CohereProvider (embeddings).'
    );
  }

  async chat(messages: Message[], context: string[]): Promise<string> {
    const conversation = messages
      .filter((m): m is Message & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await this.client.messages.create({
      model: config.claudeChatModel,
      max_tokens: 1024,
      system: buildSystemPrompt(context),
      messages: conversation,
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }
}
