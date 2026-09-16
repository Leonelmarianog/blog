import { buildCspDirectives } from '@bootstrap/helmet/csp.factory';
import { parseEnv } from '../../../src/config/env';
import { ConfigService } from '../../../src/config/config.service';

function fakeConfig(overrides: Partial<Record<string, string>> = {}): ConfigService {
  return new ConfigService(parseEnv({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://blog:blog@localhost:5432/blog',
    SESSION_SECRET: 'a-very-long-session-secret',
    REDIS_URL: 'redis://localhost:6379',
    ...overrides,
  } as NodeJS.ProcessEnv));
}

describe('buildCspDirectives', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warn.mockRestore(); });

  it('restricts img-src to self for the local driver', () => {
    const d = buildCspDirectives(fakeConfig({ STORAGE_DRIVER: 'local' }));
    expect(d.imgSrc).toEqual(["'self'"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns and ignores S3_PUBLIC_BASE when the driver is local', () => {
    const d = buildCspDirectives(fakeConfig({ STORAGE_DRIVER: 'local', S3_PUBLIC_BASE: 'https://cdn.example.com/assets' }));
    expect(d.imgSrc).toEqual(["'self'"]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('appends the S3 origin for the s3 driver with a valid base', () => {
    const d = buildCspDirectives(fakeConfig({ STORAGE_DRIVER: 's3', S3_PUBLIC_BASE: 'https://cdn.example.com/assets' }));
    expect(d.imgSrc).toEqual(["'self'", 'https://cdn.example.com']);
  });

  it('warns and falls back to self when the driver is s3 but the base is empty', () => {
    const d = buildCspDirectives(fakeConfig({ STORAGE_DRIVER: 's3', S3_PUBLIC_BASE: '' }));
    expect(d.imgSrc).toEqual(["'self'"]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('throws on a malformed S3_PUBLIC_BASE (fail-fast at boot)', () => {
    expect(() => buildCspDirectives(fakeConfig({ STORAGE_DRIVER: 's3', S3_PUBLIC_BASE: 'not-a-url' }))).toThrow();
  });

  it('locks down the other directives', () => {
    const d = buildCspDirectives(fakeConfig());
    expect(d.defaultSrc).toEqual(["'self'"]);
    expect(d.scriptSrc).toEqual(["'self'"]);
    expect(d.styleSrc).toEqual(["'self'"]);
    expect(d.formAction).toEqual(["'self'"]);
    expect(d.objectSrc).toEqual(["'none'"]);
    expect(d.baseUri).toEqual(["'self'"]);
  });
});
