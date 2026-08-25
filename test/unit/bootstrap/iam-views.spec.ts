import express from 'express';
import request from 'supertest';
import { configureViewEngine } from '../../../src/bootstrap/views/view-engine';

async function render(view: string, locals: Record<string, unknown>) {
  const app = express();
  configureViewEngine(app);
  app.get('/x', (_req, res) => res.render(view, locals));
  return request(app).get('/x');
}

describe('iam views', () => {
  const base = { csrfToken: 'T', flash: [], title: 'X', currentNav: '' };

  it('register renders the form posting to /register', async () => {
    const r = await render('iam/register', { ...base, errors: {} });
    expect(r.status).toBe(200);
    expect(r.text).toMatch(/action="\/register"/);
    expect(r.text).toContain('value="T"');
  });

  it('login renders the form posting to /login with a remember-me checkbox', async () => {
    const r = await render('iam/login', { ...base, errors: {} });
    expect(r.status).toBe(200);
    expect(r.text).toMatch(/action="\/login"/);
    expect(r.text).toMatch(/name="rememberMe"/);
  });

  it('reset-password embeds selector+verifier as hidden fields', async () => {
    const r = await render('iam/reset-password', { ...base, selector: 's', verifier: 'v', errors: {} });
    expect(r.text).toMatch(/name="selector"[^>]*value="s"/);
    expect(r.text).toMatch(/name="verifier"[^>]*value="v"/);
  });

  it('profile shows the user email and role', async () => {
    const r = await render('iam/profile', { ...base, user: { email: 'a@b.com', role: 'READER' } });
    expect(r.text).toContain('a@b.com');
    expect(r.text).toContain('READER');
  });
});
