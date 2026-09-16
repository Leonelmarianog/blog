import { Controller, Get, Post, Param, Body, Req, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CsrfInterceptor } from '@bootstrap/csrf/csrf.interceptor';
import { UploadAssetUseCase, type UploadAssetInput } from '@contexts/media/application/commands/upload-asset.use-case';
import { GetAssetUseCase, type GetAssetInput } from '@contexts/media/application/queries/get-asset.use-case';
import { UploadMetadataDto } from '../dto/upload-metadata.dto';
import { SessionGuard } from '@kernel/application/authorization/session.guard';
import { PoliciesGuard } from '@kernel/application/authorization/policies.guard';
import { Policies } from '@kernel/application/authorization/policies.decorator';
import { FormView } from '@bootstrap/exceptions/form-view.decorator';

/**
 * Minimal request shape the MediaController reads from — framework-agnostic (no express
 * import) so the unit test passes plain mocks; NestJS injects the real express request,
 * which satisfies this structural contract. `file` arrives via @UploadedFile (multer).
 */
export interface MediaRequest {
  body: Record<string, unknown>;
  params: Record<string, string>;
  flash: (type: string, msg: string) => void;
  session: { userId?: string; role?: string };
}

export interface MediaResponse {
  locals: { csrfToken: string; flash: unknown[] };
  status: (code: number) => MediaResponse;
  render: (view: string, locals: Record<string, unknown>) => void;
  redirect: (code: number, url: string) => void;
}

/**
 * multer options — memory storage only. Mime/size validation is done in-handler (below)
 * so a wrong mime or oversize file re-renders the upload form with a 200 form error (per
 * spec §10) instead of multer throwing a 415/413 before the handler can render. The
 * `STORAGE_MAX_BYTES` constant is read lazily so test-env overrides take effect.
 */
const multerOptions = { storage: memoryStorage() };
const MAX_BYTES = () => Number(process.env.STORAGE_MAX_BYTES ?? 5_242_880);
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'] as const;

@Controller()
export class MediaController {
  constructor(
    private readonly upload: UploadAssetUseCase,
    private readonly getAsset: GetAssetUseCase,
  ) {}

  @Get('upload')
  @UseGuards(SessionGuard, PoliciesGuard)
  @Policies('create', 'Asset')
  showUpload(@Res() res: MediaResponse): void {
    res.render('media/upload', {
      title: 'Upload',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      errors: {},
      currentNav: 'upload',
    });
  }

  @Post('upload')
  @UseGuards(SessionGuard, PoliciesGuard)
  @Policies('create', 'Asset')
  @UseInterceptors(FileInterceptor('file', multerOptions), CsrfInterceptor)
  @FormView('media/upload')
  async doUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadMetadataDto,
    @Req() req: MediaRequest,
    @Res() res: MediaResponse,
  ): Promise<void> {
    if (!file) {
      res.status(200).render('media/upload', {
        title: 'Upload',
        csrfToken: res.locals.csrfToken,
        flash: res.locals.flash,
        caption: dto.caption,
        errors: { form: 'No file uploaded' },
        currentNav: 'upload',
      });
      return;
    }
    if (!ALLOWED.includes(file.mimetype as (typeof ALLOWED)[number])) {
      res.status(200).render('media/upload', {
        title: 'Upload',
        csrfToken: res.locals.csrfToken,
        flash: res.locals.flash,
        caption: dto.caption,
        errors: { form: 'Only PNG, JPEG, and WebP images are allowed' },
        currentNav: 'upload',
      });
      return;
    }
    if (file.size > MAX_BYTES()) {
      res.status(200).render('media/upload', {
        title: 'Upload',
        csrfToken: res.locals.csrfToken,
        flash: res.locals.flash,
        caption: dto.caption,
        errors: { form: `File exceeds the ${MAX_BYTES()} byte limit` },
        currentNav: 'upload',
      });
      return;
    }
    const result = await this.upload.execute({
      ownerId: req.session.userId as UploadAssetInput['ownerId'],
      file: { buffer: file.buffer, mimetype: file.mimetype, size: file.size, originalname: file.originalname },
    });
    if (result.ok) {
      req.flash('success', 'Image uploaded.');
      res.redirect(302, `/assets/${result.value.assetId}`);
    } else {
      res.status(200).render('media/upload', {
        title: 'Upload',
        csrfToken: res.locals.csrfToken,
        flash: res.locals.flash,
        caption: dto.caption,
        errors: { form: result.error.message },
        currentNav: 'upload',
      });
    }
  }

  @Get('assets/:id')
  @UseGuards(PoliciesGuard)
  @Policies('read', 'Asset')
  async showAsset(@Param('id') id: string, @Res() res: MediaResponse): Promise<void> {
    const result = await this.getAsset.execute({ id: id as GetAssetInput['id'] });
    if (!result.ok) {
      res.redirect(302, '/login');
      return;
    }
    res.render('media/asset', {
      title: 'Asset',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      asset: result.value,
      currentNav: '',
    });
  }
}
