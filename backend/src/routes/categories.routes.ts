import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows: catRows } = await pool.query<{ name: string }>(
      'SELECT name FROM categories ORDER BY name'
    );
    const { rows: subRows } = await pool.query<{ category_name: string; name: string }>(
      'SELECT category_name, name FROM subcategories ORDER BY category_name, name'
    );

    const categories = catRows.map((c) => ({
      name: c.name,
      subcategories: subRows.filter((s) => s.category_name === c.name).map((s) => s.name),
    }));

    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name ?? '').trim().toUpperCase();
    if (!name) return res.status(400).json({ error: 'name is required' });

    await pool.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [name]
    );
    res.status(201).json({ name });
  } catch (err) {
    next(err);
  }
});

router.post('/:category/subcategories', async (req, res, next) => {
  try {
    const category = req.params.category;
    const name = String(req.body.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const catCheck = await pool.query('SELECT 1 FROM categories WHERE name = $1', [category]);
    if (!catCheck.rows.length) return res.status(404).json({ error: 'Category not found' });

    await pool.query(
      'INSERT INTO subcategories (category_name, name) VALUES ($1, $2) ON CONFLICT (category_name, name) DO NOTHING',
      [category, name]
    );
    res.status(201).json({ name });
  } catch (err) {
    next(err);
  }
});

export default router;
