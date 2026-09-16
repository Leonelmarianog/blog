import { useHarness } from './helpers/harness';
import { formPost, formPostUrls } from './helpers/csrf';
import { CACHE, type CachePort } from '@kernel/application';

const { getAgent, getSeed, getApp } = useHarness();

async function loginAsAdmin(
  agent: ReturnType<typeof getAgent>,
  email: string,
  password: string,
): Promise<void> {
  const res = await formPost(agent, '/login', { email, password });
  expect(res.status).toBe(302);
}

describe('cache invalidation', () => {
  it('invalidates iam:user:<id> + iam:users on UserRoleChanged (admin change-role)', async () => {
    const admin = await getSeed().user({ email: 'admin@example.com', password: 'Password123!', role: 'ADMIN' });
    const target = await getSeed().user({ email: 'target@example.com', password: 'Password123!', role: 'READER' });

    const cache = getApp().get<CachePort>(CACHE);
    await cache.set(`iam:user:${target.id}`, { role: 'READER' }, 60);
    await cache.set('iam:users:page1', { items: [] }, 60);
    // A non-matching key that must survive the iam:users prefix flush.
    await cache.set('iam:user:sentinel', 1, 60);

    const agent = getAgent();
    await loginAsAdmin(agent, admin.email, admin.password);

    // POST /admin/users/:id/role (form). The form is GET /admin/users; the action is
    // /admin/users/<id>/role. ChangeRoleDto's field name is `role`.
    const res = await formPostUrls(agent, '/admin/users', `/admin/users/${target.id}/role`, { role: 'AUTHOR' });
    expect(res.status).toBe(302);

    expect(await cache.get(`iam:user:${target.id}`)).toBeNull();
    expect(await cache.get('iam:users:page1')).toBeNull();
    // The exact-key delete targeted iam:user:<target.id>; the sentinel (iam:user:, not iam:users) survives.
    expect(await cache.get('iam:user:sentinel')).not.toBeNull();
  });

  it('flushes iam:users on UserRegistered (register)', async () => {
    const cache = getApp().get<CachePort>(CACHE);
    await cache.set('iam:users:page1', { items: [] }, 60);
    await cache.set('blog:post:1', { title: 'x' }, 60); // unrelated namespace must survive

    const agent = getAgent();
    // The register route throttles at 5/h; one POST is well within budget. Redirects to /login on ok.
    const res = await formPost(agent, '/register', { email: 'newuser@example.com', password: 'Password123!' });
    expect(res.status).toBe(302);

    expect(await cache.get('iam:users:page1')).toBeNull();
    expect(await cache.get('blog:post:1')).not.toBeNull();
  });
});
