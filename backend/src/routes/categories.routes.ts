import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/categories — list all with subcategories and note counts
router.get('/', async (_req, res, next) => {
  try {
    const { rows: catRows } = await pool.query<{
      id: string; name: string; icon: string; sort_order: number; note_count: string;
    }>(`
      SELECT c.id, c.name, c.icon, c.sort_order,
             COUNT(DISTINCT n.id) AS note_count
      FROM categories c
      LEFT JOIN notes n ON n.category = c.name
      GROUP BY c.id, c.name, c.icon, c.sort_order
      ORDER BY c.sort_order, c.name
    `);

    const { rows: subRows } = await pool.query<{
      id: string; category_name: string; name: string; sort_order: number; note_count: string;
    }>(`
      SELECT s.id, s.category_name, s.name, s.sort_order,
             COUNT(DISTINCT n.id) AS note_count
      FROM subcategories s
      LEFT JOIN notes n ON n.category = s.category_name AND n.subcategory = s.name
      GROUP BY s.id, s.category_name, s.name, s.sort_order
      ORDER BY s.sort_order, s.name
    `);

    const categories = catRows.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      sort_order: c.sort_order,
      note_count: parseInt(c.note_count, 10),
      subcategories: subRows
        .filter((s) => s.category_name === c.name)
        .map((s) => ({
          id: s.id,
          name: s.name,
          sort_order: s.sort_order,
          note_count: parseInt(s.note_count, 10),
        })),
    }));

    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories — create category
router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name ?? '').trim().toUpperCase();
    const icon = String(req.body.icon ?? '📁').trim() || '📁';
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { rows: maxRow } = await pool.query<{ max: string }>(
      'SELECT COALESCE(MAX(sort_order), 0) AS max FROM categories'
    );
    const nextOrder = parseInt(maxRow[0].max, 10) + 1;

    const { rows } = await pool.query<{ id: string; name: string; icon: string; sort_order: number }>(
      `INSERT INTO categories (name, icon, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon
       RETURNING id, name, icon, sort_order`,
      [name, icon, nextOrder]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/subcategories/:id — update subcategory (must be before /:id)
router.put('/subcategories/:id', async (req, res, next) => {
  try {
    const name = String(req.body.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { rows: existing } = await pool.query<{ name: string; category_name: string }>(
      'SELECT name, category_name FROM subcategories WHERE id = $1',
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Subcategory not found' });

    const { name: oldName, category_name: catName } = existing[0];
    if (name !== oldName) {
      await pool.query(
        'UPDATE notes SET subcategory = $1 WHERE category = $2 AND subcategory = $3',
        [name, catName, oldName]
      );
      await pool.query(
        'UPDATE files SET subcategory = $1 WHERE category = $2 AND subcategory = $3',
        [name, catName, oldName]
      );
    }

    const { rows } = await pool.query<{ id: string; name: string; category_name: string }>(
      `UPDATE subcategories SET name = $1 WHERE id = $2 RETURNING id, name, category_name`,
      [name, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/subcategories/:id — delete subcategory (must be before /:id)
router.delete('/subcategories/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query<{ name: string; category_name: string }>(
      'SELECT name, category_name FROM subcategories WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Subcategory not found' });

    const { name, category_name: catName } = rows[0];
    await pool.query(
      'UPDATE notes SET subcategory = NULL WHERE category = $1 AND subcategory = $2',
      [catName, name]
    );
    await pool.query(
      'UPDATE files SET subcategory = NULL WHERE category = $1 AND subcategory = $2',
      [catName, name]
    );
    await pool.query('DELETE FROM subcategories WHERE id = $1', [req.params.id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id — update category
router.put('/:id', async (req, res, next) => {
  try {
    const { rows: existing } = await pool.query<{ id: string; name: string; icon: string; sort_order: number }>(
      'SELECT id, name, icon, sort_order FROM categories WHERE id = $1',
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Category not found' });

    const oldName = existing[0].name;
    const newName = req.body.name ? String(req.body.name).trim().toUpperCase() : oldName;
    const newIcon = req.body.icon != null ? String(req.body.icon).trim() || '📁' : existing[0].icon;

    if (newName !== oldName) {
      await pool.query('UPDATE notes SET category = $1 WHERE category = $2', [newName, oldName]);
      await pool.query('UPDATE files SET category = $1 WHERE category = $2', [newName, oldName]);
    }

    const { rows } = await pool.query<{ id: string; name: string; icon: string; sort_order: number }>(
      `UPDATE categories SET name = $1, icon = $2 WHERE id = $3 RETURNING id, name, icon, sort_order`,
      [newName, newIcon, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id — delete category
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query<{ name: string }>(
      'SELECT name FROM categories WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });

    const { name } = rows[0];
    await pool.query('UPDATE notes SET category = NULL, subcategory = NULL WHERE category = $1', [name]);
    await pool.query('UPDATE files SET category = NULL, subcategory = NULL WHERE category = $1', [name]);
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/categories/:categoryRef/subcategories — create subcategory (lookup by id or name)
router.post('/:categoryRef/subcategories', async (req, res, next) => {
  try {
    const ref = req.params.categoryRef;
    const name = String(req.body.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const isUUID = UUID_RE.test(ref);
    const { rows: catRows } = isUUID
      ? await pool.query<{ name: string }>('SELECT name FROM categories WHERE id = $1', [ref])
      : await pool.query<{ name: string }>('SELECT name FROM categories WHERE name = $1', [ref.toUpperCase()]);

    if (!catRows.length) return res.status(404).json({ error: 'Category not found' });
    const catName = catRows[0].name;

    const { rows: maxRow } = await pool.query<{ max: string }>(
      'SELECT COALESCE(MAX(sort_order), 0) AS max FROM subcategories WHERE category_name = $1',
      [catName]
    );
    const nextOrder = parseInt(maxRow[0].max, 10) + 1;

    const { rows } = await pool.query<{ id: string; name: string; category_name: string }>(
      `INSERT INTO subcategories (category_name, name, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (category_name, name) DO NOTHING
       RETURNING id, name, category_name`,
      [catName, name, nextOrder]
    );

    if (!rows.length) {
      const { rows: found } = await pool.query<{ id: string; name: string; category_name: string }>(
        'SELECT id, name, category_name FROM subcategories WHERE category_name = $1 AND name = $2',
        [catName, name]
      );
      return res.json(found[0]);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
