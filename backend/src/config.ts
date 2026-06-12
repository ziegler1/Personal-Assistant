import 'dotenv/config';

export type AiProviderName = 'claude' | 'ollama' | 'openai';

const aiProvider = (process.env.AI_PROVIDER as AiProviderName) || 'ollama';

// Embedding dimensions per provider - the DB migration creates the
// `notes.embedding` vector column using whichever of these matches
// AI_PROVIDER at migration time.
const EMBEDDING_DIMENSIONS: Record<AiProviderName, number> = {
  claude: 1024, // Cohere embed-english-v3.0
  ollama: 768, // nomic-embed-text
  openai: 1536, // text-embedding-3-small
};

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  searchMinScore: Number(process.env.SEARCH_MIN_SCORE) || 0.5,

  aiProvider,
  embeddingDimensions: EMBEDDING_DIMENSIONS[aiProvider],

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeChatModel: process.env.CLAUDE_CHAT_MODEL || 'claude-sonnet-4-5',

  cohereApiKey: process.env.COHERE_API_KEY || '',
  cohereEmbedModel: process.env.COHERE_EMBED_MODEL || 'embed-english-v3.0',

  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiChatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  openaiEmbedModel: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',

  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaChatModel: process.env.OLLAMA_CHAT_MODEL || 'qwen3:8b',
  ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',

  tavilyApiKey: process.env.TAVILY_API_KEY || '',

  r2: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    endpoint: process.env.R2_ENDPOINT || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
  notifyEmail: process.env.NOTIFY_EMAIL || '',
};
