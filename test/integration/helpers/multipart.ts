import type { supertest } from './agent';
import { getCsrfToken } from './csrf';

/**
 * Faithful multipart CSRF round-trip for the upload form: GETs the form to mint the
 * session-bound CSRF token, extracts it, then POSTs multipart/form-data with the file
 * attached under the `file` field plus any extra text fields (and _csrf).
 */
export async function formUpload(
  agent: supertest.Agent,
  getUrl: string,
  postUrl: string,
  file: { buffer: Buffer; filename: string; contentType: string },
  fields: Record<string, string> = {},
): Promise<supertest.Response> {
  const getRes = await agent.get(getUrl).expect(200);
  const csrf = getCsrfToken(getRes.text);
  const req = agent.post(postUrl).field('_csrf', csrf);
  for (const [k, v] of Object.entries(fields)) req.field(k, v);
  return req.attach('file', file.buffer, { filename: file.filename, contentType: file.contentType });
}
