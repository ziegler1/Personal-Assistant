import { randomUUID } from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db/pool';
import * as r2 from '../services/r2Service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.note_id, f.r2_key, f.filename, f.mime_type, f.size_bytes, f.created_at,
              n.title AS note_title
       FROM files f
       LEFT JOIN notes n ON n.id = f.note_id
       ORDER BY f.created_at DESC`
    );
    res.json({ files: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (expected multipart field "file")' });
    }

    const noteId = req.body.note_id || null;
    const key = `${randomUUID()}-${req.file.originalname}`;

    await r2.uploadFile(key, req.file.buffer, req.file.mimetype);

    const { rows } = await pool.query(
      `INSERT INTO files (note_id, r2_key, filename, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, note_id, r2_key, filename, mime_type, size_bytes, created_at`,
      [noteId, key, req.file.originalname, req.file.mimetype, req.file.size]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT r2_key FROM files WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'File not found' });

    const url = await r2.getDownloadUrl(rows[0].r2_key);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM files WHERE id = $1 RETURNING r2_key', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'File not found' });

    await r2.deleteFile(rows[0].r2_key);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
