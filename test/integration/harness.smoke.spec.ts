import { useHarness } from './helpers/harness';
import { getCsrfToken } from './helpers/csrf';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

describe('integration harness', () => {
  it('boots the app and serves the login form with a csrf token', async () => {
    const res = await getAgent().get('/login').expect(200);
    expect(() => getCsrfToken(res.text)).not.toThrow();
  });

  it('seeds a user that is queryable via PrismaService', async () => {
    const u = await getSeed().user({ email: 'smoke@example.com' });
    const prisma = getApp().get(PrismaService);
    const row = await prisma.user.findUnique({ where: { id: u.id } });
    expect(row?.email).toBe('smoke@example.com');
  });
});
