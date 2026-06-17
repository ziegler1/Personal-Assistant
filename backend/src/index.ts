import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config';
import { runMigrations } from './db/migrate';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import categoriesRoutes from './routes/categories.routes';
import chatRoutes from './routes/chat.routes';
import exportRoutes from './routes/export.routes';
import filesRoutes from './routes/files.routes';
import notesRoutes from './routes/notes.routes';
import shareRoutes from './routes/share.routes';

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Public endpoints — no auth
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', aiProvider: config.aiProvider });
});
app.use('/api/auth', authRoutes);
app.use('/api/share', shareRoutes);

// Protected endpoints — require valid session cookie
app.use('/api/notes', requireAuth, notesRoutes);
app.use('/api/files', requireAuth, filesRoutes);
app.use('/api/categories', requireAuth, categoriesRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/export', requireAuth, exportRoutes);

app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await runMigrations();
    console.log('Database migrations applied');
  } catch (err) {
    console.error('Failed to run database migrations:', err);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port} (AI provider: ${config.aiProvider})`);
  });
}

start();
