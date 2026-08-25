import { Module } from '@nestjs/common';
import {
  USER_REPOSITORY,
  SESSION_REPOSITORY,
  TOKEN_REPOSITORY,
  QUEUE_PRODUCER,
  PASSWORD_HASHER,
  TOKEN_HASHER,
} from '@contexts/iam/application/ports';
import { UNIT_OF_WORK } from '@kernel/application';
import { PrismaUserRepository } from '@infra/persistence/repositories/user.repository';
import { PrismaSessionRepository } from '@infra/persistence/repositories/session.repository';
import { PrismaTokenRepository } from '@infra/persistence/repositories/token.repository';
import { LoggingQueueProducer } from '@infra/queue/logging-queue-producer';
import { PasswordHasherService } from '@contexts/iam/application/services/password-hasher.service';
import { TokenService } from '@contexts/iam/application/services/token.service';
import { RememberMeTokenService } from '@contexts/iam/application/services/remember-me-token.service';
import { RegisterUseCase } from '@contexts/iam/application/commands/register.use-case';
import { VerifyEmailUseCase } from '@contexts/iam/application/commands/verify-email.use-case';
import { ResendVerificationUseCase } from '@contexts/iam/application/commands/resend-verification.use-case';
import { LoginUseCase } from '@contexts/iam/application/commands/login.use-case';
import { LogoutUseCase } from '@contexts/iam/application/commands/logout.use-case';
import { ForgotPasswordUseCase } from '@contexts/iam/application/commands/forgot-password.use-case';
import { ResetPasswordUseCase } from '@contexts/iam/application/commands/reset-password.use-case';
import { RotateSessionUseCase } from '@contexts/iam/application/commands/rotate-session.use-case';
import { RevokeSessionUseCase } from '@contexts/iam/application/commands/revoke-session.use-case';
import { GetCurrentUserUseCase } from '@contexts/iam/application/queries/get-current-user.use-case';
import { AuthController } from './controllers/auth.controller';
import { SessionGuard } from './guards/session.guard';

// Each `useFactory` uses the `ConstructorParameters<typeof X>` spread idiom so the factory
// param types are inferred from the constructor — no explicit `any` tokens (which
// `@typescript-eslint/no-explicit-any` rejects). NOTE: the `inject: [...]` array is NOT
// type-linked to the constructor — the compiler does NOT catch an `inject`/param order
// mismatch. Each `inject` array MUST be hand-verified against the constructor signature
// below; a wrong order silently injects the wrong provider at runtime. The param order
// for each use-case is documented here for that manual verification:
//   RegisterUseCase(users, tokens, tokenService, passwordHasher, queue, uow)
//   VerifyEmailUseCase(tokens, users, tokenHasher, uow)
//   ResendVerificationUseCase(users, tokens, tokenService, queue, uow)
//   LoginUseCase(users, passwordHasher, rememberMe, sessions, uow)
//   LogoutUseCase(sessions, tokenHasher, uow)
//   ForgotPasswordUseCase(users, tokens, tokenService, queue, uow)
//   ResetPasswordUseCase(tokens, users, sessions, passwordHasher, tokenHasher, uow)
//   RotateSessionUseCase(sessions, tokenHasher, rememberMe, uow)
//   RevokeSessionUseCase(sessions, uow)
//   GetCurrentUserUseCase(users)
@Module({
  controllers: [AuthController],
  providers: [
    // AuthController is also listed as a provider so it can be exported. Nest's
    // `validateExportedProvider` only looks in `_providers` (controllers live in a
    // separate map), so a controller must appear in both arrays to be exportable.
    AuthController,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: TOKEN_REPOSITORY, useClass: PrismaTokenRepository },
    // QUEUE_PRODUCER is also provided by the global QueueModule — this local binding
    // shadows the global one cleanly, and this redundancy is intentional.
    { provide: QUEUE_PRODUCER, useClass: LoggingQueueProducer },
    SessionGuard,
    {
      provide: PasswordHasherService,
      useFactory: (...args: ConstructorParameters<typeof PasswordHasherService>) => new PasswordHasherService(...args),
      inject: [PASSWORD_HASHER],
    },
    {
      provide: TokenService,
      useFactory: (...args: ConstructorParameters<typeof TokenService>) => new TokenService(...args),
      inject: [TOKEN_HASHER],
    },
    {
      provide: RememberMeTokenService,
      useFactory: (...args: ConstructorParameters<typeof RememberMeTokenService>) => new RememberMeTokenService(...args),
      inject: [TOKEN_HASHER],
    },
    {
      provide: RegisterUseCase,
      useFactory: (...args: ConstructorParameters<typeof RegisterUseCase>) => new RegisterUseCase(...args),
      inject: [USER_REPOSITORY, TOKEN_REPOSITORY, TokenService, PasswordHasherService, QUEUE_PRODUCER, UNIT_OF_WORK],
    },
    {
      provide: VerifyEmailUseCase,
      useFactory: (...args: ConstructorParameters<typeof VerifyEmailUseCase>) => new VerifyEmailUseCase(...args),
      inject: [TOKEN_REPOSITORY, USER_REPOSITORY, TOKEN_HASHER, UNIT_OF_WORK],
    },
    {
      provide: ResendVerificationUseCase,
      useFactory: (...args: ConstructorParameters<typeof ResendVerificationUseCase>) => new ResendVerificationUseCase(...args),
      inject: [USER_REPOSITORY, TOKEN_REPOSITORY, TokenService, QUEUE_PRODUCER, UNIT_OF_WORK],
    },
    {
      provide: LoginUseCase,
      useFactory: (...args: ConstructorParameters<typeof LoginUseCase>) => new LoginUseCase(...args),
      inject: [USER_REPOSITORY, PasswordHasherService, RememberMeTokenService, SESSION_REPOSITORY, UNIT_OF_WORK],
    },
    {
      provide: LogoutUseCase,
      useFactory: (...args: ConstructorParameters<typeof LogoutUseCase>) => new LogoutUseCase(...args),
      inject: [SESSION_REPOSITORY, TOKEN_HASHER, UNIT_OF_WORK],
    },
    {
      provide: ForgotPasswordUseCase,
      useFactory: (...args: ConstructorParameters<typeof ForgotPasswordUseCase>) => new ForgotPasswordUseCase(...args),
      inject: [USER_REPOSITORY, TOKEN_REPOSITORY, TokenService, QUEUE_PRODUCER, UNIT_OF_WORK],
    },
    {
      provide: ResetPasswordUseCase,
      useFactory: (...args: ConstructorParameters<typeof ResetPasswordUseCase>) => new ResetPasswordUseCase(...args),
      inject: [TOKEN_REPOSITORY, USER_REPOSITORY, SESSION_REPOSITORY, PasswordHasherService, TOKEN_HASHER, UNIT_OF_WORK],
    },
    {
      provide: RotateSessionUseCase,
      useFactory: (...args: ConstructorParameters<typeof RotateSessionUseCase>) => new RotateSessionUseCase(...args),
      inject: [SESSION_REPOSITORY, TOKEN_HASHER, RememberMeTokenService, UNIT_OF_WORK],
    },
    {
      provide: RevokeSessionUseCase,
      useFactory: (...args: ConstructorParameters<typeof RevokeSessionUseCase>) => new RevokeSessionUseCase(...args),
      inject: [SESSION_REPOSITORY, UNIT_OF_WORK],
    },
    {
      provide: GetCurrentUserUseCase,
      useFactory: (...args: ConstructorParameters<typeof GetCurrentUserUseCase>) => new GetCurrentUserUseCase(...args),
      inject: [USER_REPOSITORY],
    },
  ],
  exports: [
    USER_REPOSITORY,
    SESSION_REPOSITORY,
    TOKEN_REPOSITORY,
    QUEUE_PRODUCER,
    RotateSessionUseCase,
    AuthController,
  ],
})
export class IamModule {}
