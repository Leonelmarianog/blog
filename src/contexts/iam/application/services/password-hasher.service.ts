import { PasswordHasherPort } from '../ports/password-hasher.port';
import { HashedPassword } from '../../domain/user/hashed-password.vo';

export class PasswordHasherService {
  constructor(private readonly hasher: PasswordHasherPort) {}

  async hashPassword(plain: string): Promise<HashedPassword> {
    return HashedPassword.fromHash(await this.hasher.hash(plain));
  }

  async verifyPassword(plain: string, hashed: HashedPassword): Promise<boolean> {
    return this.hasher.verify(plain, hashed.hash);
  }
}
