import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

// Public — no auth required. Returns only the data for the specific token.
router.get('/:token', async (req, res, next) => {
  try {
    const { rows } = await pool.query<{
      title: string;
      content: string;
      content_type: string;
      tags: string[];
      category: string | null;
      subcategory: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT n.title, n.content, n.content_type, n.tags, n.category, n.subcategory,
              n.created_at, n.updated_at
       FROM share_links sl
       JOIN notes n ON n.id = sl.note_id
       WHERE sl.token = $1
         AND sl.revoked_at IS NULL
         AND (sl.expires_at IS NULL OR sl.expires_at > now())`,
      [req.params.token],
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Share link not found or has been revoked' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
