import { Injectable } from '@nestjs/common';
import { hash, verify, Algorithm } from '@node-rs/argon2';
import { PasswordHasherPort } from '@contexts/iam/application/ports/password-hasher.port';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasherPort {
  // OWASP-recommended Argon2id parameters.
  private static readonly OPTIONS = {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  } as const;

  async hash(password: string): Promise<string> {
    return hash(password, Argon2PasswordHasher.OPTIONS);
  }

  async verify(password: string, hashed: string): Promise<boolean> {
    // @node-rs/argon2's verify takes (hashed, password); the port takes (password, hash).
    return verify(hashed, password);
  }
}
