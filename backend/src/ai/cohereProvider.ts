import { CohereClient } from 'cohere-ai';
import { config } from '../config';
import { AIProvider, Message } from './types';

export class CohereProvider implements AIProvider {
  private client: CohereClient;

  constructor() {
    this.client = new CohereClient({ token: config.cohereApiKey });
  }

  async embed(text: string): Promise<number[]> {
    // Cohere v3 embedding models distinguish between document and query
    // embeddings via inputType, but the shared AIProvider interface only
    // has one embed() used for both - 'search_document' is a reasonable
    // default for both notes and search queries.
    const response = await this.client.embed({
      texts: [text],
      model: config.cohereEmbedModel,
      inputType: 'search_document',
    });

    const embeddings = response.embeddings as number[][];
    return embeddings[0];
  }

  async chat(_messages: Message[], _context: string[]): Promise<string> {
    throw new Error(
      'CohereProvider does not support chat. AI_PROVIDER=claude pairs CohereProvider (embeddings) with ClaudeProvider (chat).'
    );
  }
}
