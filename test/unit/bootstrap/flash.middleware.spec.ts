import { FlashMiddleware } from '../../../src/bootstrap/flash/flash.middleware';
import { InMemorySession } from '../iam/in-memory-session';

type FlashMessage = { type: string; msg: string };
type Locals = { flash?: FlashMessage[] };
type Req = { method?: string; session: InMemorySession; flash?: (type: string, msg: string) => void };
type Res = { locals: Locals };

describe('FlashMiddleware', () => {
  it('req.flash stores messages keyed by type in the session', () => {
    const session = new InMemorySession();
    const req: Req = { session };
    const res: Res = { locals: {} };
    new FlashMiddleware().use(req, res, () => {});
    req.flash!('success', 'hi');
    req.flash!('error', 'nope');
    expect(session.flash).toContainEqual({ type: 'success', msg: 'hi' });
    expect(session.flash).toContainEqual({ type: 'error', msg: 'nope' });
  });

  it('reads and clears flash into res.locals.flash on GET, leaving the session empty', () => {
    const session = new InMemorySession();
    session.flash = [{ type: 'success', msg: 'done' }];
    const req: Req = { method: 'GET', session };
    const res: Res = { locals: {} };
    new FlashMiddleware().use(req, res, () => {});
    expect(res.locals.flash).toContainEqual({ type: 'success', msg: 'done' });
    expect(session.flash).toHaveLength(0);
  });
});
