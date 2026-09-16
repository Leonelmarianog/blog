import { randomUUID } from 'node:crypto';
import type { DestinationStream } from 'pino';
import type { Options } from 'pino-http';
import type { ConfigService } from '../../config/config.service';

/** pino redact paths — secrets leave the log as `[Redacted]`. `req.body.email` is intentionally NOT redacted. */
const REDACT = {
  paths: [
    'req.headers.cookie',
    'req.headers.authorization',
    'req.headers["x-csrf-token"]',
    'res.headers["set-cookie"]',
    'req.body.password',
    'req.body.newPassword',
    'req.body.confirmPassword',
  ],
  censor: '[Redacted]',
};

/**
 * Custom `req` serializer — includes `id` and `body` so the redact paths above
 * (`req.body.password`, …) have something to match. pino applies redact after serializers.
 *
 * pino-http wraps this via `wrapRequestSerializer`, so the argument is NOT the raw Express
 * request — it is pino-std-serializers' `req` object (`{ id, method, url, headers, … }`) with
 * the raw Express request attached as the non-enumerable `raw` property. `body` therefore lives
 * on `req.raw.body` (populated by the body parsers before the response finishes), not `req.body`.
 */
function reqSerializer(req: {
  id?: string;
  method?: string;
  url?: string;
  headers?: unknown;
  raw?: { body?: unknown };
}) {
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.raw?.body,
  };
}

/**
 * Builds pino-http options shared by the explicit request-logging middleware (create-app.ts)
 * and the nestjs-pino Logger (autoLogging:false). `destination` is the test seam: when provided,
 * JSON lines stream to it at `info`; when omitted in `test`, the level is `silent` so the shared
 * `createApp()` boot path stays quiet under jest.
 */
export function buildPinoOptions(config: ConfigService, destination?: DestinationStream): Options {
  const nodeEnv = config.get('NODE_ENV');
  const base: Options = {
    redact: REDACT,
    serializers: { req: reqSerializer as NonNullable<Options['serializers']>['req'] },
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'] as string | undefined;
      if (existing) return existing;
      const id = randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
  };
  if (destination) return { ...base, useLevel: 'info', stream: destination };
  if (nodeEnv === 'test') return { ...base, useLevel: 'silent' };
  if (nodeEnv === 'development') return { ...base, useLevel: 'info', transport: { target: 'pino-pretty' } };
  return { ...base, useLevel: 'info' }; // production: JSON to stdout
}
