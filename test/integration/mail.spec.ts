import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { TOKEN_HASHER } from '@contexts/iam/application/ports/token-hasher.port';
import type { TokenHasherPort } from '@contexts/iam/application/ports/token-hasher.port';
import { useHarness } from './helpers/harness';
import { formPost } from './helpers/csrf';
import { waitForEmailTo, getMessageBody } from './helpers/mail';

// The DB stores only verifierHash (tokenHasher.hash(verifier)); the email link carries the
// RAW verifier. Cross-check by hashing the extracted verifier and comparing verifierHash.
// In the HTML, Handlebars escapes `&` → `&amp;`, so the link regex tolerates both forms.
const LINK = (path: string) =>
  new RegExp(`http://app\\.test/${path}\\?selector=([^&]+)&(?:amp;)?verifier=([^\\s<"']+)"`);

describe('Mail queue (register + forgot-password)', () => {
  const { getAgent, getApp, getWorkerApp, getSeed } = useHarness({ withWorker: true });

  it('enqueues + sends a verification email on register, link matches the token row', async () => {
    const app = getApp();
    const prisma = app.get(PrismaService);
    const tokenHasher = app.get<TokenHasherPort>(TOKEN_HASHER);

    const res = await formPost(getAgent(), '/register', {
      email: 'verify@example.test',
      password: 'Password123!',
    });
    expect(res.status).toBe(302);

    const msg = await waitForEmailTo('verify@example.test', {
      subject: /verify/i,
      workerApp: getWorkerApp(),
    });
    const body = await getMessageBody(msg.ID);
    const match = body.match(LINK('verify-email'));
    expect(match).not.toBeNull();
    const selector = decodeURIComponent(match![1]);
    const verifier = decodeURIComponent(match![2]);

    const token = await prisma.token.findUnique({ where: { selector } });
    expect(token).not.toBeNull();
    expect(token!.verifierHash).toBe(tokenHasher.hash(verifier));
    expect(token!.type).toBe('VERIFICATION');
  });

  it('enqueues + sends a reset email on forgot-password, link matches the token row', async () => {
    const app = getApp();
    const prisma = app.get(PrismaService);
    const tokenHasher = app.get<TokenHasherPort>(TOKEN_HASHER);
    const user = await getSeed().user({ email: 'reset@example.test', emailVerified: true });

    const res = await formPost(getAgent(), '/forgot-password', { email: 'reset@example.test' });
    expect(res.status).toBe(302);

    const msg = await waitForEmailTo('reset@example.test', {
      subject: /reset/i,
      workerApp: getWorkerApp(),
    });
    const body = await getMessageBody(msg.ID);
    const match = body.match(LINK('reset-password'));
    expect(match).not.toBeNull();
    const selector = decodeURIComponent(match![1]);
    const verifier = decodeURIComponent(match![2]);

    const token = await prisma.token.findUnique({ where: { selector } });
    expect(token).not.toBeNull();
    expect(token!.verifierHash).toBe(tokenHasher.hash(verifier));
    expect(token!.type).toBe('RESET');
    expect(token!.userId).toBe(user.id);
  });
});
