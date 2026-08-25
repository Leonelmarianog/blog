import { Global, Module } from '@nestjs/common';
import { PASSWORD_HASHER } from '@contexts/iam/application/ports/password-hasher.port';
import { TOKEN_HASHER } from '@contexts/iam/application/ports/token-hasher.port';
import { Argon2PasswordHasher } from './argon2-password-hasher';
import { Sha256TokenHasher } from './sha256-token-hasher';

@Global()
@Module({
  providers: [
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_HASHER, useClass: Sha256TokenHasher },
  ],
  exports: [PASSWORD_HASHER, TOKEN_HASHER],
})
export class CryptoModule {}
