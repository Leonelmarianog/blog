import express from 'express';
import request from 'supertest';
import { configureViewEngine } from '../../../src/bootstrap/views/view-engine';

describe('view engine', () => {
  it('renders errors/400 wrapped in the main layout with shared partials wired up', async () => {
    const app = express();
    configureViewEngine(app);
    app.get('/t', (_req, res) => res.render('errors/400', { message: 'Bad input', title: 'Bad' }));
    const r = await request(app).get('/t');
    expect(r.status).toBe(200);
    // main layout wraps the body (multi-root views + layout + partials all wire up)
    expect(r.text).toContain('<title>Bad</title>');
    // errors/400 body variable substituted
    expect(r.text).toContain('Bad input');
  });
});
