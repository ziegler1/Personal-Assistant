import { randomBytes } from 'crypto';
import { Router } from 'express';
import { pool } from '../db/pool';
import * as notesService from '../services/notesService';
import { config } from '../config';
import { ContentType } from '../types/models';

const router = Router();

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const tag = req.query.tag ? String(req.query.tag) : undefined;
    const contentType = req.query.content_type ? (String(req.query.content_type) as ContentType) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const subcategory = req.query.subcategory ? String(req.query.subcategory) : undefined;

    if (!q) {
      const results = await notesService.listNotes({ tag, contentType, category, subcategory });
      return res.json({ results });
    }

    let minScore = config.searchMinScore;
    if (req.query.minScore !== undefined) {
      const parsed = Number(req.query.minScore);
      if (!Number.isNaN(parsed)) minScore = Math.min(1, Math.max(0, parsed));
    }

    const results = await notesService.searchNotes(q, { tag, contentType, category, subcategory, minScore });
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

router.get('/tags', async (_req, res, next) => {
  try {
    const tags = await notesService.listTags();
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tag = req.query.tag ? String(req.query.tag) : undefined;
    const contentType = req.query.content_type ? (String(req.query.content_type) as ContentType) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const subcategory = req.query.subcategory ? String(req.query.subcategory) : undefined;
    const notes = await notesService.listNotes({ tag, contentType, category, subcategory });
    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const note = await notesService.createNote(req.body);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const note = await notesService.getNoteById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const note = await notesService.updateNote(req.params.id, req.body);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await notesService.deleteNote(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Note not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/share', async (req, res, next) => {
  try {
    const note = await notesService.getNoteById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const token = randomBytes(32).toString('hex');
    await pool.query('INSERT INTO share_links (token, note_id) VALUES ($1, $2)', [token, req.params.id]);
    res.status(201).json({ token });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/shares', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, token, created_at, expires_at, revoked_at
       FROM share_links WHERE note_id = $1 ORDER BY created_at DESC`,
      [req.params.id],
    );
    res.json({ shares: rows });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/share/:token', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE share_links SET revoked_at = now()
       WHERE token = $1 AND note_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [req.params.token, req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Share link not found or already revoked' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
