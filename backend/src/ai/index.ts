import { config } from '../config';
import { AIProvider, WebSearchProvider } from './types';
import { ClaudeProvider } from './claudeProvider';
import { CohereProvider } from './cohereProvider';
import { OllamaProvider } from './ollamaProvider';
import { OpenAIProvider } from './openaiProvider';
import { TavilyProvider } from './tavilyProvider';

let chatProvider: AIProvider | undefined;
let embeddingProvider: AIProvider | undefined;
let webSearchProvider: WebSearchProvider | undefined;

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

export function getWebSearchProvider(): WebSearchProvider {
  if (!webSearchProvider) {
    webSearchProvider = new TavilyProvider();
  }
  return webSearchProvider;
}

export * from './types';
