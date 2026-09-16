import type { RequestHandler } from 'express';

/**
 * Two-line shim: copies pino-http's `req.id` onto `res.locals.correlationId` so the 500 page
 * can render a searchable reference. Must run AFTER `pinoHttp(...)` has assigned `req.id`.
 */
export function createCorrelationMiddleware(): RequestHandler {
  return (req, res, next) => {
    res.locals.correlationId = (req as { id?: string }).id;
    next();
  };
}
