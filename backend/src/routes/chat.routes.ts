import { Router } from 'express';
import * as chatService from '../services/chatService';
import * as generateService from '../services/generateService';
import { GENERATE_FORMATS, GenerateFormat } from '../services/generateService';
import { Message } from '../ai';
import { ContentType } from '../types/models';

const router = Router();

router.get('/history', async (_req, res, next) => {
  try {
    const messages = await chatService.getRecentMessages(20);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const messages = req.body?.messages as Message[] | undefined;
    const contentType = req.body?.content_type as ContentType | undefined;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Request body must include a non-empty "messages" array' });
    }

    const lastUser = messages[messages.length - 1];
    if (lastUser?.role === 'user') {
      await chatService.saveMessage('user', lastUser.content);
    }

    const result = await chatService.chat(messages, { contentType });

    await chatService.saveMessage('assistant', result.reply, result.sources, result.webResults);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const content = req.body?.content as string | undefined;
    const format = req.body?.format as GenerateFormat | undefined;

    if (!content || !format || !GENERATE_FORMATS.includes(format)) {
      return res.status(400).json({
        error: `Request body must include "content" (string) and "format" (one of: ${GENERATE_FORMATS.join(', ')})`,
      });
    }

    const result = await generateService.generate(format, content);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
