import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PASSWORD_HASHER } from '../../src/contexts/iam/application/ports/password-hasher.port';
import { TOKEN_HASHER } from '../../src/contexts/iam/application/ports/token-hasher.port';
import { USER_REPOSITORY } from '../../src/contexts/iam/application/ports/user.repository.port';
import { SESSION_REPOSITORY } from '../../src/contexts/iam/application/ports/session.repository.port';
import { TOKEN_REPOSITORY } from '../../src/contexts/iam/application/ports/token.repository.port';
import { QUEUE_PRODUCER } from '../../src/contexts/iam/application/ports/queue-producer.port';
import { UNIT_OF_WORK } from '../../src/shared-kernel/application/ports/unit-of-work.port';
import { PrismaUserRepository } from '../../src/infrastructure/persistence/repositories/user.repository';
import { RotateSessionUseCase } from '../../src/contexts/iam/application/commands/rotate-session.use-case';
import { AuthController } from '../../src/contexts/iam/presentation/http/controllers/auth.controller';

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

describe('AppModule IAM wiring', () => {
  it('binds IAM repository/queue/UoW tokens and the RotateSession use-case', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef.get(USER_REPOSITORY)).toBeInstanceOf(PrismaUserRepository);
    expect(moduleRef.get(SESSION_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(TOKEN_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(QUEUE_PRODUCER)).toBeDefined();
    expect(moduleRef.get(UNIT_OF_WORK)).toBeDefined();
    expect(moduleRef.get(RotateSessionUseCase)).toBeInstanceOf(RotateSessionUseCase);
    expect(moduleRef.get(AuthController)).toBeDefined();
    await moduleRef.close();
  });
});
