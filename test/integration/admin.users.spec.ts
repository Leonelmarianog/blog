import { useHarness } from './helpers/harness';
import { formPost, formPostUrls } from './helpers/csrf';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

async function loginAs(agent: ReturnType<typeof getAgent>, email: string, password: string): Promise<void> {
  const res = await formPost(agent, '/login', { email, password });
  expect(res.status).toBe(302);
}

describe('GET /admin/users', () => {
  it('lists users for an ADMIN', async () => {
    const admin = await getSeed().user({ email: 'admin@example.com', password: 'Password123!', role: 'ADMIN' });
    const target = await getSeed().user({ email: 'target@example.com', role: 'READER' });
    const agent = getAgent();
    await loginAs(agent, admin.email, admin.password);
    const res = await agent.get('/admin/users').expect(200);
    expect(res.text).toContain(target.email);
  });

  it('returns 403 for an AUTHOR', async () => {
    const author = await getSeed().user({ email: 'author@example.com', password: 'Password123!', role: 'AUTHOR' });
    const agent = getAgent();
    await loginAs(agent, author.email, author.password);
    const res = await agent.get('/admin/users');
    expect(res.status).toBe(403);
    expect(res.text).toContain('Forbidden');
  });

  it('redirects to /login when unauthenticated', async () => {
    const res = await getAgent().get('/admin/users');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});

describe('POST /admin/users/:id/suspend (and /unsuspend)', () => {
  it('suspends then reactivates a user', async () => {
    const admin = await getSeed().user({ email: 'admin2@example.com', password: 'Password123!', role: 'ADMIN' });
    const target = await getSeed().user({ email: 't@example.com', role: 'READER' });
    const agent = getAgent();
    await loginAs(agent, admin.email, admin.password);

    // Suspend + unsuspend are POST-only; mint the session-scoped CSRF token from
    // GET /admin/users (the list view renders {{> csrf}} per-row forms) and POST to the action URL.
    const suspendRes = await formPostUrls(agent, '/admin/users', `/admin/users/${target.id}/suspend`, {});
    expect(suspendRes.status).toBe(302);
    const prisma = getApp().get(PrismaService);
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.status).toBe('SUSPENDED');

    const unsuspendRes = await formPostUrls(agent, '/admin/users', `/admin/users/${target.id}/unsuspend`, {});
    expect(unsuspendRes.status).toBe(302);
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.status).toBe('ACTIVE');
  });

  it('returns 403 for a non-admin', async () => {
    const author = await getSeed().user({ email: 'a2@example.com', password: 'Password123!', role: 'AUTHOR' });
    const target = await getSeed().user({ email: 't2@example.com', role: 'READER' });
    const agent = getAgent();
    await loginAs(agent, author.email, author.password);
    // An AUTHOR is 403'd from GET /admin/users, so mint the CSRF token from GET /login (always 200,
    // renders {{> csrf}}) — the token is session-scoped and valid for any POST. With a valid _csrf,
    // the request reaches PoliciesGuard which denies `manage User` for an AUTHOR → 403.
    const res = await formPostUrls(agent, '/login', `/admin/users/${target.id}/suspend`, {});
    expect(res.status).toBe(403);
  });
});

describe('POST /admin/users/:id/role', () => {
  it('changes the role and invalidates the target sessions', async () => {
    const admin = await getSeed().user({ email: 'admin3@example.com', password: 'Password123!', role: 'ADMIN' });
    const target = await getSeed().user({ email: 't3@example.com', role: 'READER', password: 'Password123!' });
    await getSeed().session({ userId: target.id });
    const agent = getAgent();
    await loginAs(agent, admin.email, admin.password);

    const res = await formPostUrls(agent, '/admin/users', `/admin/users/${target.id}/role`, { role: 'AUTHOR' });
    expect(res.status).toBe(302);
    const prisma = getApp().get(PrismaService);
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.role).toBe('AUTHOR');
    expect((await prisma.session.findMany({ where: { userId: target.id } })).length).toBe(0);
  });

  it('re-renders the admin users view (status 200, not 400) on an invalid role payload', async () => {
    const admin = await getSeed().user({ email: 'admin4@example.com', password: 'Password123!', role: 'ADMIN' });
    const target = await getSeed().user({ email: 't4@example.com', role: 'READER' });
    const agent = getAgent();
    await loginAs(agent, admin.email, admin.password);
    // An invalid role value fails class-validator (@IsIn(ROLES)) on ChangeRoleDto; @FormView('iam/admin/users')
    // makes ValidationExceptionFilter re-render the list view at 200. The filter only provides
    // { ...req.body, errors, csrfToken, flash, title } — no `users`/`total` locals — but users.hbs iterates
    // {{#each users}} (Handlebars treats undefined as empty, no throw) and otherwise only reads csrfToken/flash,
    // so the render succeeds at 200 rather than 500.
    const res = await formPostUrls(agent, '/admin/users', `/admin/users/${target.id}/role`, { role: 'NOT_A_ROLE' });
    expect(res.status).toBe(200);
  });
});
