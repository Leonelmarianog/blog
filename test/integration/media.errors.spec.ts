import { useHarness } from './helpers/harness';
import { formUpload } from './helpers/multipart';
import { formPost, getCsrfToken } from './helpers/csrf';
import { assertHtml } from './helpers/html';

const { getAgent, getSeed } = useHarness();

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFElEQVQYlWM4YWSEBzGMShthCRYANAd1MXMpExkAAAAASUVORK5CYII=',
  'base64',
);

async function loginAsAuthor() {
  const u = await getSeed().user({ password: 'Password123!', emailVerified: true, role: 'AUTHOR' });
  await formPost(getAgent(), '/login', { email: u.email, password: u.password });
  return u;
}

describe('media upload error rendering', () => {
  it('re-renders the form (200) on an oversize file', async () => {
    await loginAsAuthor();
    process.env.STORAGE_MAX_BYTES = '100';
    try {
      const big = Buffer.alloc(200, 0);
      const res = await formUpload(getAgent(), '/upload', '/upload',
        { buffer: big, filename: 'big.png', contentType: 'image/png' });
      expect(res.status).toBe(200);
      assertHtml(res.text).contains('exceeds');
    } finally {
      delete process.env.STORAGE_MAX_BYTES;
    }
  });

  it('re-renders the form (200) on a wrong mime', async () => {
    await loginAsAuthor();
    const res = await formUpload(getAgent(), '/upload', '/upload',
      { buffer: Buffer.from('not an image'), filename: 't.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    assertHtml(res.text).contains('Only PNG, JPEG, and WebP');
  });

  it('returns 403 on a missing CSRF token', async () => {
    await loginAsAuthor();
    const res = await getAgent()
      .post('/upload')
      .attach('file', PNG, { filename: 't.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  it('re-renders the form (200) when no file is attached', async () => {
    await loginAsAuthor();
    // GET the form for the CSRF token, then POST _csrf only — no file attach.
    const form = await getAgent().get('/upload').expect(200);
    const csrf = getCsrfToken(form.text);
    const res = await getAgent().post('/upload').field('_csrf', csrf);
    expect(res.status).toBe(200);
    assertHtml(res.text).contains('No file uploaded');
  });
});
