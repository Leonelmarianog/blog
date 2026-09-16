import { buildPinoOptions } from '@bootstrap/logging/pino.factory';
import { parseEnv } from '../../../src/config/env';
import { ConfigService } from '../../../src/config/config.service';

function fakeConfig(overrides: Partial<Record<string, string>> = {}): ConfigService {
  return new ConfigService(parseEnv({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://blog:blog@localhost:5432/blog',
    SESSION_SECRET: 'a-very-long-session-secret',
    REDIS_URL: 'redis://localhost:6379',
    ...overrides,
  } as NodeJS.ProcessEnv));
}

describe('buildPinoOptions', () => {
  it('uses pino-pretty transport in development', () => {
    const opts = buildPinoOptions(fakeConfig({ NODE_ENV: 'development' }));
    expect(opts.transport).toEqual({ target: 'pino-pretty' });
    expect(opts.useLevel).toBe('info');
  });

  it('emits raw JSON (no transport) in production', () => {
    const opts = buildPinoOptions(fakeConfig({ NODE_ENV: 'production' }));
    expect(opts.transport).toBeUndefined();
    expect(opts.useLevel).toBe('info');
  });

  it('runs silent in test when no destination is provided', () => {
    const opts = buildPinoOptions(fakeConfig({ NODE_ENV: 'test' }));
    expect(opts.useLevel).toBe('silent');
    expect(opts.stream).toBeUndefined();
  });

  it('uses the provided destination at info level', () => {
    const sink = { write: jest.fn() } as unknown as import('pino').DestinationStream;
    const opts = buildPinoOptions(fakeConfig({ NODE_ENV: 'test' }), sink);
    expect(opts.useLevel).toBe('info');
    expect(opts.stream).toBe(sink);
  });

  it('redacts secrets and censors with [Redacted]', () => {
    const opts = buildPinoOptions(fakeConfig()) as unknown as {
      redact: { paths: string[]; censor: string };
    };
    expect(opts.redact.censor).toBe('[Redacted]');
    expect(opts.redact.paths).toContain('req.headers.cookie');
    expect(opts.redact.paths).toContain('req.headers.authorization');
    expect(opts.redact.paths).toContain('req.headers["x-csrf-token"]');
    expect(opts.redact.paths).toContain('res.headers["set-cookie"]');
    expect(opts.redact.paths).toContain('req.body.password');
    expect(opts.redact.paths).toContain('req.body.newPassword');
    expect(opts.redact.paths).toContain('req.body.confirmPassword');
  });

  it('provides a genReqId that reuses x-request-id and otherwise generates a uuid', () => {
    const opts = buildPinoOptions(fakeConfig()) as unknown as { genReqId: (req: { headers: Record<string,string|undefined> }, res: { setHeader: jest.Mock }) => string };
    const res = { setHeader: jest.fn() } as unknown as { setHeader: jest.Mock };
    expect(opts.genReqId({ headers: { 'x-request-id': 'abc' } }, res)).toBe('abc');
    expect(res.setHeader).not.toHaveBeenCalled();
    const id = opts.genReqId({ headers: {} }, res);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', id);
  });
});
