import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PASSWORD_HASHER } from '../../src/contexts/iam/application/ports/password-hasher.port';
import { TOKEN_HASHER } from '../../src/contexts/iam/application/ports/token-hasher.port';

describe('AppModule', () => {
  it('initializes', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });

  it('provides the Argon2 password hasher and SHA-256 token hasher', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const passwordHasher = moduleRef.get(PASSWORD_HASHER);
    const tokenHasher = moduleRef.get(TOKEN_HASHER);
    expect(typeof passwordHasher.hash).toBe('function');
    expect(typeof tokenHasher.hash).toBe('function');
    await moduleRef.close();
  });
});
