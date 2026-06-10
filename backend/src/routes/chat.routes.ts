import { Router } from 'express';
import * as chatService from '../services/chatService';
import { Message } from '../ai';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const messages = req.body?.messages as Message[] | undefined;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Request body must include a non-empty "messages" array' });
    }

    const result = await chatService.chat(messages);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
