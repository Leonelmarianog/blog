import { MediaController, type MediaRequest, type MediaResponse } from '@contexts/media/presentation/http/controllers/media.controller';
import type { UploadAssetUseCase } from '@contexts/media/application/commands/upload-asset.use-case';
import type { GetAssetUseCase } from '@contexts/media/application/queries/get-asset.use-case';
import { ok, fail } from '@kernel/application';
import { DomainError, Identifier } from '@kernel/domain';
import { Asset } from '@contexts/media/domain/asset/asset.aggregate';
import { OriginalFile } from '@contexts/media/domain/asset/original-file.vo';

const OWNER = Identifier.from<'User'>('owner-1');

interface MockFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

interface MockReq {
  flash: jest.Mock;
  session: { userId?: string; role?: string };
}

interface Rendered {
  view: string;
  locals: Record<string, unknown>;
}

interface MockRes {
  locals: { csrfToken: string; flash: unknown[] };
  rendered: Rendered | null;
  redirected: string;
  statused: number | null;
  status: jest.Mock;
  render: jest.Mock;
  redirect: jest.Mock;
}

function fakeUpload(): UploadAssetUseCase {
  return {
    execute: jest.fn(async () => ok({ assetId: Identifier.from<'Asset'>('asset-1') })),
  } as unknown as UploadAssetUseCase;
}
function fakeUploadFailing(): UploadAssetUseCase {
  return {
    execute: jest.fn(async () => fail(new DomainError('Invalid image'))),
  } as unknown as UploadAssetUseCase;
}
function fakeGet(asset: Asset | null): GetAssetUseCase {
  return {
    execute: jest.fn(async () => asset
      ? ok({
        id: asset.id, originalUrl: 'http://cdn/o.png', originalMime: 'image/png',
        originalWidth: 1000, originalHeight: 800, variants: [],
      })
      : fail(new DomainError('Asset not found'))),
  } as unknown as GetAssetUseCase;
}
function mkReq(): MockReq {
  return { flash: jest.fn(), session: { userId: OWNER } };
}
function mkRes(): MockRes {
  const res: MockRes = {
    locals: { csrfToken: 'csrf', flash: [] },
    rendered: null,
    redirected: '',
    statused: null,
    status: jest.fn((code: number) => { res.statused = code; return res; }),
    render: jest.fn((view: string, locals: Record<string, unknown>) => { res.rendered = { view, locals }; }),
    redirect: jest.fn((code: number, url: string) => { res.redirected = url; }),
  };
  return res;
}
function mkFile(): MockFile {
  return { buffer: Buffer.from('x'), mimetype: 'image/png', size: 100, originalname: 'a.png' };
}

describe('MediaController', () => {
  // STORAGE_MAX_BYTES is read lazily from process.env by the controller; restore it
  // after every test so an oversize override never leaks into a sibling test.
  afterEach(() => { delete process.env.STORAGE_MAX_BYTES; });

  it('GET /upload renders the upload form', () => {
    const c = new MediaController(fakeUpload(), fakeGet(null));
    const r = mkRes();
    c.showUpload(r as unknown as MediaResponse);
    expect(r.render).toHaveBeenCalledWith('media/upload', expect.objectContaining({ title: 'Upload', currentNav: 'upload', errors: {} }));
  });

  it('POST /upload redirects to /assets/:id on success', async () => {
    const up = fakeUpload();
    const c = new MediaController(up, fakeGet(null));
    const rq = mkReq(); const r = mkRes();
    await c.doUpload(mkFile() as unknown as Express.Multer.File, { caption: '' }, rq as unknown as MediaRequest, r as unknown as MediaResponse);
    expect(up.execute).toHaveBeenCalled();
    expect(r.redirect).toHaveBeenCalledWith(302, '/assets/asset-1');
  });

  it('POST /upload re-renders with errors.form on use-case failure', async () => {
    const c = new MediaController(fakeUploadFailing(), fakeGet(null));
    const rq = mkReq(); const r = mkRes();
    await c.doUpload(mkFile() as unknown as Express.Multer.File, { caption: '' }, rq as unknown as MediaRequest, r as unknown as MediaResponse);
    expect(r.redirect).not.toHaveBeenCalled();
    expect(r.render).toHaveBeenCalledWith('media/upload', expect.objectContaining({ errors: { form: 'Invalid image' } }));
  });

  it('POST /upload re-renders with errors.form when no file was uploaded', async () => {
    const c = new MediaController(fakeUpload(), fakeGet(null));
    const rq = mkReq(); const r = mkRes();
    await c.doUpload(undefined, { caption: '' }, rq as unknown as MediaRequest, r as unknown as MediaResponse);
    expect(r.render).toHaveBeenCalledWith('media/upload', expect.objectContaining({ errors: { form: 'No file uploaded' } }));
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('POST /upload re-renders with errors.form on oversize file', async () => {
    process.env.STORAGE_MAX_BYTES = '10';
    const c = new MediaController(fakeUpload(), fakeGet(null));
    const rq = mkReq(); const r = mkRes();
    await c.doUpload(mkFile() as unknown as Express.Multer.File, { caption: '' }, rq as unknown as MediaRequest, r as unknown as MediaResponse);
    expect(r.render).toHaveBeenCalledWith('media/upload', expect.objectContaining({ errors: { form: expect.stringContaining('exceeds') } }));
    expect(r.redirect).not.toHaveBeenCalled();
  });

  it('POST /upload re-renders with errors.form on wrong mime', async () => {
    const c = new MediaController(fakeUpload(), fakeGet(null));
    const rq = mkReq(); const r = mkRes();
    const bad = mkFile(); bad.mimetype = 'application/pdf';
    await c.doUpload(bad as unknown as Express.Multer.File, { caption: '' }, rq as unknown as MediaRequest, r as unknown as MediaResponse);
    expect(r.render).toHaveBeenCalledWith('media/upload', expect.objectContaining({ errors: { form: 'Only PNG, JPEG, and WebP images are allowed' } }));
    expect(r.redirect).not.toHaveBeenCalled();
  });

  it('GET /assets/:id redirects to /login when not found and unauthenticated', async () => {
    const c = new MediaController(fakeUpload(), fakeGet(null));
    const r = mkRes();
    await c.showAsset('nope', r as unknown as MediaResponse);
    expect(r.redirect).toHaveBeenCalledWith(302, '/login');
  });

  it('GET /assets/:id renders the asset view when found', async () => {
    const orig = OriginalFile.create({ key: 'assets/a/o.png', mime: 'image/png', size: 1, width: 1, height: 1 });
    if (!orig.ok) throw new Error('fixture');
    const asset = Asset.upload({ ownerId: OWNER, original: orig.value });
    const c = new MediaController(fakeUpload(), fakeGet(asset));
    const r = mkRes();
    await c.showAsset(asset.id, r as unknown as MediaResponse);
    expect(r.render).toHaveBeenCalledWith('media/asset', expect.objectContaining({ asset: expect.objectContaining({ originalUrl: 'http://cdn/o.png' }) }));
  });
});
