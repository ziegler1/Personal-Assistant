import { config } from '../config';
import { AIProvider, Message } from './types';
import { buildSystemPrompt } from './systemPrompt';

export class OllamaProvider implements AIProvider {
  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${config.ollamaBaseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.ollamaEmbedModel, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embeddings request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }

  async chat(messages: Message[], context: string[]): Promise<string> {
    const ollamaMessages = [
      { role: 'system', content: buildSystemPrompt(context) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.ollamaChatModel, messages: ollamaMessages, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as { message: { content: string } };
    return data.message.content;
  }
}
