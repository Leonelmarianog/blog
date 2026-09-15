import type { supertest } from './agent';

/** Extract the csrf token from a rendered form (`<input type="hidden" name="_csrf" value="…">`). */
export function getCsrfToken(html: string): string {
  const m = html.match(/name="_csrf"\s+value="([^"]+)"/);
  if (!m) throw new Error('csrf token not found in HTML');
  return m[1];
}

/**
 * Faithful CSRF round-trip for a self-posting form (GET url === POST url, e.g. /login).
 * GETs the form to mint the session-bound token, extracts it, merges `_csrf`, then POSTs.
 */
export async function formPost(
  agent: supertest.Agent,
  url: string,
  fields: Record<string, string | number | boolean>,
): Promise<supertest.Response> {
  return formPostUrls(agent, url, url, fields);
}

/**
 * CSRF round-trip where the GET (form) URL and POST (action) URL differ — e.g. reset-password,
 * where the form is GET /reset-password?selector=..&verifier=.. and the action is POST /reset-password.
 */
export async function formPostUrls(
  agent: supertest.Agent,
  getUrl: string,
  postUrl: string,
  fields: Record<string, string | number | boolean>,
): Promise<supertest.Response> {
  const getRes = await agent.get(getUrl).expect(200);
  const csrf = getCsrfToken(getRes.text);
  return agent.post(postUrl).type('form').send({ ...fields, _csrf: csrf });
}
