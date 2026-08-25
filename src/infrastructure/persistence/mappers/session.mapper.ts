import { Identifier } from '@kernel/domain';
import { Session } from '@contexts/iam/domain/session/session.entity';
import type { SessionProps } from '@contexts/iam/domain/session/session.entity';
import type { Prisma } from '../prisma/client';

type SessionRow = Prisma.SessionGetPayload<{}>;

export const SessionMapper = {
  toPersistence(session: Session): Prisma.SessionUncheckedCreateInput {
    return {
      id: session.id,
      userId: session.userId,
      seriesHash: session.seriesHash,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      rotatedAt: session.rotatedAt,
    };
  },

  toDomain(row: SessionRow): Session {
    const props: SessionProps = {
      id: Identifier.from<'Session'>(row.id),
      userId: Identifier.from<'User'>(row.userId),
      seriesHash: row.seriesHash,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      rotatedAt: row.rotatedAt,
    };
    return Session.fromPersistence(props);
  },
};
