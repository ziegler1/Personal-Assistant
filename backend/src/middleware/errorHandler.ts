import { NextFunction, Request, Response } from 'express';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
