import { Router } from 'express';
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

    if (!q) {
      const results = await notesService.listNotes({ tag, contentType, category });
      return res.json({ results });
    }

    let minScore = config.searchMinScore;
    if (req.query.minScore !== undefined) {
      const parsed = Number(req.query.minScore);
      if (!Number.isNaN(parsed)) minScore = Math.min(1, Math.max(0, parsed));
    }

    const results = await notesService.searchNotes(q, { tag, contentType, category, minScore });
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
    const notes = await notesService.listNotes({ tag, contentType, category });
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

export default router;
