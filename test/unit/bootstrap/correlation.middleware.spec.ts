import { createCorrelationMiddleware } from '@bootstrap/logging/correlation.middleware';
import type { Request, Response, NextFunction } from 'express';

function run(req: Partial<Request> & { id?: string }, res: Partial<Response> & { locals: Record<string, unknown> }) {
  const next = jest.fn() as unknown as NextFunction;
  createCorrelationMiddleware()(req as Request, res as Response, next);
  return { res, next };
}

describe('CorrelationMiddleware', () => {
  it('copies req.id to res.locals.correlationId and calls next', () => {
    const { res, next } = run({ id: 'abc-123' }, { locals: {} });
    expect(res.locals.correlationId).toBe('abc-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves correlationId undefined when req.id is absent', () => {
    const { res, next } = run({}, { locals: {} });
    expect(res.locals.correlationId).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
