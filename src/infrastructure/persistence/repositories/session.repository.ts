import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../prisma/client';
import { SessionMapper } from '../mappers/session.mapper';
import { Session } from '@contexts/iam/domain/session/session.entity';
import type { SessionId } from '@contexts/iam/domain/session/session.types';
import type { UserId } from '@contexts/iam/domain/user/user.types';
import type { SessionRepositoryPort } from '@contexts/iam/application/ports/session.repository.port';

@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort<Prisma.TransactionClient> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: SessionId, tx?: Prisma.TransactionClient): Promise<Session | null> {
    const row = await (tx ?? this.prisma).session.findUnique({ where: { id } });
    return row ? SessionMapper.toDomain(row) : null;
  }

  async findBySeriesHash(seriesHash: string, tx?: Prisma.TransactionClient): Promise<Session | null> {
    const row = await (tx ?? this.prisma).session.findUnique({ where: { seriesHash } });
    return row ? SessionMapper.toDomain(row) : null;
  }

  async findByUserId(userId: UserId, tx?: Prisma.TransactionClient): Promise<Session[]> {
    const rows = await (tx ?? this.prisma).session.findMany({ where: { userId } });
    return rows.map((r) => SessionMapper.toDomain(r));
  }

  async save(session: Session, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).session.create({ data: SessionMapper.toPersistence(session) });
  }

  async update(session: Session, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).session.update({
      where: { id: session.id },
      data: SessionMapper.toPersistence(session),
    });
  }

  async delete(id: SessionId, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).session.delete({ where: { id } });
  }

  async deleteByUserId(userId: UserId, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).session.deleteMany({ where: { userId } });
  }
}
