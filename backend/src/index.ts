import cors from 'cors';
import express from 'express';
import { config } from './config';
import { runMigrations } from './db/migrate';
import { errorHandler } from './middleware/errorHandler';
import categoriesRoutes from './routes/categories.routes';
import chatRoutes from './routes/chat.routes';
import exportRoutes from './routes/export.routes';
import filesRoutes from './routes/files.routes';
import notesRoutes from './routes/notes.routes';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', aiProvider: config.aiProvider });
});

app.use('/api/notes', notesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/export', exportRoutes);

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
