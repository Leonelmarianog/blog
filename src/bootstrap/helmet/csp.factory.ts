import type { ConfigService } from '../../config/config.service';

/**
 * Returns the S3 origin to append to img-src, or null when img-src should be `['self']` only.
 * Emits a `console.warn` for the two misconfigs (pino is not yet wired when helmet is built —
 * helmet runs first). A malformed `S3_PUBLIC_BASE` with the s3 driver throws → fail-fast at boot.
 */
function storageOrigin(config: ConfigService): string | null {
  const driver = config.get('STORAGE_DRIVER');
  const publicBase = config.get('S3_PUBLIC_BASE');
  if (driver !== 's3') {
    if (publicBase) console.warn('S3_PUBLIC_BASE is set but STORAGE_DRIVER is not "s3"; ignoring it for CSP img-src.');
    return null;
  }
  if (!publicBase) {
    console.warn('STORAGE_DRIVER is "s3" but S3_PUBLIC_BASE is unset; CSP img-src is restricted to \'self\' (S3 images may be blocked).');
    return null;
  }
  return new URL(publicBase).origin;
}

export function buildCspDirectives(config: ConfigService): Record<string, string[]> {
  const origin = storageOrigin(config);
  return {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: origin ? ["'self'", origin] : ["'self'"],
    formAction: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
  };
}
