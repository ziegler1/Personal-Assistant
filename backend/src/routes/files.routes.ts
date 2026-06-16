import path from 'path';
import { randomUUID } from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db/pool';
import * as r2 from '../services/r2Service';
import * as ingestion from '../services/ingestionService';
import { ExtractionStatus } from '../types/models';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.md', '.json']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.has(ext)) {
      return cb(
        Object.assign(new Error('Unsupported file type. Accepted types: PDF, PNG, JPG, TXT, MD, JSON.'), {
          status: 400,
        })
      );
    }
    cb(null, true);
  },
});

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.note_id, f.r2_key, f.filename, f.mime_type, f.size_bytes, f.extraction_status,
              f.category, f.subcategory, f.created_at, n.title AS note_title
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
    const category = req.body.category || null;
    const subcategory = req.body.subcategory || null;
    const key = `${randomUUID()}-${req.file.originalname}`;

    await r2.uploadFile(key, req.file.buffer, req.file.mimetype);

    const { rows } = await pool.query(
      `INSERT INTO files (note_id, r2_key, filename, mime_type, size_bytes, category, subcategory)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, note_id, r2_key, filename, mime_type, size_bytes, extraction_status, category, subcategory, created_at`,
      [noteId, key, req.file.originalname, req.file.mimetype, req.file.size, category, subcategory]
    );

    const file = rows[0];
    let noteTitle: string | undefined;

    if (!noteId) {
      let extractedText: string | null | undefined;
      if (req.file.mimetype === 'application/pdf') {
        extractedText = await ingestion.extractPdfText(req.file.buffer);
      } else if (req.file.mimetype.startsWith('image/')) {
        extractedText = await ingestion.extractImageText(req.file.buffer);
      }

      if (extractedText !== undefined) {
        const extractionStatus: ExtractionStatus =
          extractedText === null ? 'error' : extractedText.length > 0 ? 'success' : 'empty';
        const note = await ingestion.createNoteFromFileText(req.file.originalname, extractedText ?? '');
        await pool.query('UPDATE files SET note_id = $1, extraction_status = $2 WHERE id = $3', [
          note.id,
          extractionStatus,
          file.id,
        ]);
        file.note_id = note.id;
        file.extraction_status = extractionStatus;
        noteTitle = note.title;
      }
    }

    res.status(201).json({ ...file, note_title: noteTitle });
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

router.patch('/:id', async (req, res, next) => {
  try {
    const { category, subcategory } = req.body;
    const { rows } = await pool.query(
      `UPDATE files SET category = $1, subcategory = $2 WHERE id = $3
       RETURNING id, category, subcategory`,
      [category ?? null, subcategory ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    res.json(rows[0]);
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
