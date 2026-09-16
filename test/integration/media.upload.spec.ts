import { useHarness } from './helpers/harness';
import { formPost } from './helpers/csrf';
import { formUpload } from './helpers/multipart';
import { assertHtml } from './helpers/html';
import { listObjects, getObject } from './helpers/storage';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

// A real 10×10 PNG that sharp can re-process (resize + webp encode). The plan's base64
// 1×1 PNG triggers `vipspng: libpng read error` during sharp's resize/encode step; this
// fixture is generated via sharp so it round-trips cleanly. Tests assert counts, not dims.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFElEQVQYlWM4YWSEBzGMShthCRYANAd1MXMpExkAAAAASUVORK5CYII=',
  'base64',
);

async function loginAs(role: 'AUTHOR' | 'READER') {
  const u = await getSeed().user({ password: 'Password123!', emailVerified: true, role });
  await formPost(getAgent(), '/login', { email: u.email, password: u.password });
  return u;
}

describe('POST /upload (authenticated AUTHOR, real sharp + Garage)', () => {
  it('uploads, generates 3 variants, persists, and redirects to /assets/:id', async () => {
    await loginAs('AUTHOR');

    const res = await formUpload(getAgent(), '/upload', '/upload',
      { buffer: PNG, filename: 't.png', contentType: 'image/png' }, { caption: 'hi' });
    expect(res.status).toBe(302);
    const location = res.headers.location as string;
    expect(location).toMatch(/^\/assets\/[a-f0-9-]{36}$/);
    const assetId = location.replace('/assets/', '');

    // Original + 3 variants are really in Garage.
    const keys = await listObjects('assets/');
    expect(keys).toHaveLength(4);
    expect(keys.some((k) => k.endsWith('/original.png'))).toBe(true);
    expect(keys.some((k) => k.includes('/thumbnail.webp'))).toBe(true);
    const originalKey = keys.find((k) => k.endsWith('/original.png'))!;
    const fetched = await getObject(originalKey);
    expect(fetched.length).toBeGreaterThan(0);

    // DB has 1 Asset + 3 AssetVariant rows.
    const prisma = getApp().get(PrismaService);
    const asset = await prisma.asset.findUnique({ where: { id: assetId }, include: { variants: true } });
    expect(asset).not.toBeNull();
    expect(asset!.variants).toHaveLength(3);

    // GET /assets/:id renders the srcset with public URLs.
    const view = await getAgent().get(location).expect(200);
    assertHtml(view.text).contains('srcset');
    assertHtml(view.text).matches(/src="http:\/\/[^"]+\/assets\//);
  });
});
