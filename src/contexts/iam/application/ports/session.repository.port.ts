import type { Session } from '../../domain/session/session.entity';
import type { SessionId } from '../../domain/session/session.types';
import type { UserId } from '../../domain/user/user.types';

export interface SessionRepositoryPort<Tx = unknown> {
  findById(id: SessionId, tx?: Tx): Promise<Session | null>;
  findBySeriesHash(seriesHash: string, tx?: Tx): Promise<Session | null>;
  findByUserId(userId: UserId, tx?: Tx): Promise<Session[]>;
  save(session: Session, tx?: Tx): Promise<void>;
  update(session: Session, tx?: Tx): Promise<void>;
  delete(id: SessionId, tx?: Tx): Promise<void>;
  deleteByUserId(userId: UserId, tx?: Tx): Promise<void>;
}
