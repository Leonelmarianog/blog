import type { User } from '../../domain/user/user.aggregate';
import type { Email } from '../../domain/user/email.vo';
import type { UserId } from '../../domain/user/user.types';

export interface UserRepositoryPort<Tx = unknown> {
  findById(id: UserId, tx?: Tx): Promise<User | null>;
  findByEmail(email: Email, tx?: Tx): Promise<User | null>;
  save(user: User, tx?: Tx): Promise<void>;
  update(user: User, tx?: Tx): Promise<void>;
}
