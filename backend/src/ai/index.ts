import { config } from '../config';
import { AIProvider } from './types';
import { ClaudeProvider } from './claudeProvider';
import { CohereProvider } from './cohereProvider';
import { OllamaProvider } from './ollamaProvider';
import { OpenAIProvider } from './openaiProvider';

let chatProvider: AIProvider | undefined;
let embeddingProvider: AIProvider | undefined;

export function getChatProvider(): AIProvider {
  if (!chatProvider) {
    switch (config.aiProvider) {
      case 'claude':
        chatProvider = new ClaudeProvider();
        break;
      case 'openai':
        chatProvider = new OpenAIProvider();
        break;
      case 'ollama':
      default:
        chatProvider = new OllamaProvider();
        break;
    }
  }
  return chatProvider;
}

export function getEmbeddingProvider(): AIProvider {
  if (!embeddingProvider) {
    switch (config.aiProvider) {
      case 'claude':
        embeddingProvider = new CohereProvider();
        break;
      case 'openai':
        embeddingProvider = new OpenAIProvider();
        break;
      case 'ollama':
      default:
        embeddingProvider = new OllamaProvider();
        break;
    }
  }
  return embeddingProvider;
}

export * from './types';
