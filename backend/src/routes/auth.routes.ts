import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { COOKIE_NAME, requireAuth } from '../middleware/auth';

const router = Router();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SEVEN_DAYS_MS,
};

router.post('/login', (req, res) => {
  if (!config.appPassword) {
    res.status(503).json({ error: 'APP_PASSWORD not configured on server' });
    return;
  }
  const { password } = req.body as { password?: string };
  if (!password || password !== config.appPassword) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  const token = jwt.sign({ user: 1 }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, cookieOpts);
  res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

export default router;
