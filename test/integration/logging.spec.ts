import { Writable } from 'node:stream';
import { useHarness } from './helpers/harness';
import { formPost } from './helpers/csrf';

function collectingStream() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  return { stream, text: () => chunks.join('') };
}

function requestLogs(text: string): Array<{
  req?: { id?: string; method?: string; url?: string; headers?: Record<string, unknown>; body?: Record<string, unknown> };
  msg?: string;
}> {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null && typeof l === 'object' && 'req' in l);
}

const { stream, text } = collectingStream();
const { getAgent } = useHarness({ pinoDestination: stream });

describe('request logging', () => {
  it('logs a request completed line with req.id for a 404', async () => {
    await getAgent().get('/no-such-route').expect(404);
    const logs = requestLogs(text());
    expect(logs.some((l) => l.req?.id && l.msg === 'request completed')).toBe(true);
  });

  it('redacts the cookie header', async () => {
    await getAgent().get('/login').set('Cookie', 'sid=secret').expect(200);
    const logs = requestLogs(text());
    expect(logs.some((l) => l.req?.headers?.cookie === '[Redacted]')).toBe(true);
  });

  it('redacts req.body.password on POST /login', async () => {
    await formPost(getAgent(), '/login', { email: 'nobody@example.com', password: 'Password123!' });
    const logs = requestLogs(text());
    // The collecting stream is shared across tests, so /login GETs from earlier cases also
    // appear; select the POST (the only /login entry with a body) rather than the first match.
    const loginLog = logs.find((l) => l.req?.method === 'POST' && l.req?.url?.includes('/login'));
    expect(loginLog?.req?.body?.password).toBe('[Redacted]');
  });
});
