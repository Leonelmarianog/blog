import supertest from 'supertest';
import { useHarness } from './helpers/harness';
import { formPost, getCsrfToken } from './helpers/csrf';

const { getAgent, getSeed, getApp } = useHarness();

// A real 10×10 PNG that sharp can re-process (see media.upload.spec for rationale).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFElEQVQYlWM4YWSEBzGMShthCRYANAd1MXMpExkAAAAASUVORK5CYII=',
  'base64',
);

async function loginAs(role: 'AUTHOR' | 'READER') {
  const u = await getSeed().user({ password: 'Password123!', emailVerified: true, role });
  await formPost(getAgent(), '/login', { email: u.email, password: u.password });
  return u;
}

describe('media authorization', () => {
  it('denies READER POST /upload with 403', async () => {
    await loginAs('READER');
    // A READER cannot GET /upload (PoliciesGuard denies `create` on Asset), so mint the
    // CSRF token from /login (no guards; same session-bound token), then POST /upload.
    // PoliciesGuard runs before the FileInterceptor/CsrfInterceptor, so the 403 is the
    // authz decision — not a CSRF rejection.
    const form = await getAgent().get('/login').expect(200);
    const csrf = getCsrfToken(form.text);
    const res = await getAgent().post('/upload')
      .field('_csrf', csrf)
      .attach('file', PNG, { filename: 't.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  it('redirects unauthenticated POST /upload to /login (SessionGuard)', async () => {
    // No login. The CSRF middleware defers multipart bodies to the route interceptor, so
    // an unauthenticated multipart POST reaches SessionGuard (a Nest guard, running after
    // the middleware but before multer), which redirects to /login.
    const res = await getAgent().post('/upload')
      .attach('file', PNG, { filename: 't.png', contentType: 'image/png' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('allows anonymous GET /assets/:id (public read, no session)', async () => {
    // Seed an asset by uploading as AUTHOR on the authenticated agent.
    await loginAs('AUTHOR');
    const up = await getAgent().get('/upload').expect(200);
    const csrf = getCsrfToken(up.text);
    const res = await getAgent().post('/upload')
      .field('_csrf', csrf)
      .attach('file', PNG, { filename: 't.png', contentType: 'image/png' });
    const location = res.headers.location as string;
    expect(res.status).toBe(302);

    // A bare supertest call (no agent session cookie) = anonymous.
    const anon = supertest(getApp().getHttpServer());
    const view = await anon.get(location);
    expect(view.status).toBe(200);
  });
});
