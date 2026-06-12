import OpenAI from 'openai';
import { config } from '../config';
import { AIProvider, Message } from './types';
import { buildSystemPrompt } from './systemPrompt';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: config.openaiEmbedModel,
      input: text,
    });
    return response.data[0].embedding;
  }

  async chat(messages: Message[], context: string[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: config.openaiChatModel,
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: config.openaiChatModel,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
