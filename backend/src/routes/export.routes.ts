import { randomUUID } from 'crypto';
import { Router } from 'express';
import { pool } from '../db/pool';
import * as r2 from '../services/r2Service';
import * as emailService from '../services/emailService';

const SHARE_LINK_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days - max allowed for S3 presigned URLs

const router = Router();

router.post('/share', async (req, res, next) => {
  try {
    const { filename, mimeType, data } = req.body ?? {};
    if (!filename || !mimeType || !data) {
      return res.status(400).json({ error: 'Request body must include "filename", "mimeType", and "data" (base64)' });
    }

    const buffer = Buffer.from(data, 'base64');
    const key = `${randomUUID()}-${filename}`;

    await r2.uploadFile(key, buffer, mimeType);
    await pool.query(
      `INSERT INTO files (note_id, r2_key, filename, mime_type, size_bytes) VALUES (NULL, $1, $2, $3, $4)`,
      [key, filename, mimeType, buffer.length]
    );

    const url = await r2.getDownloadUrl(key, SHARE_LINK_EXPIRY_SECONDS);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.post('/email', async (req, res, next) => {
  try {
    const { filename, mimeType, data, subject, text } = req.body ?? {};
    if (!filename || !mimeType || !data || !subject) {
      return res
        .status(400)
        .json({ error: 'Request body must include "filename", "mimeType", "data" (base64), and "subject"' });
    }

    const buffer = Buffer.from(data, 'base64');
    await emailService.sendExportEmail(subject, text || '', { filename, content: buffer, contentType: mimeType });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
