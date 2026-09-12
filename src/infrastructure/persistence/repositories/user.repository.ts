import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../prisma/client';
import { UserMapper } from '../mappers/user.mapper';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { Email } from '@contexts/iam/domain/user/email.vo';
import type { UserId } from '@contexts/iam/domain/user/user.types';
import type { UserRepositoryPort } from '@contexts/iam/application/ports/user.repository.port';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort<Prisma.TransactionClient> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UserId, tx?: Prisma.TransactionClient): Promise<User | null> {
    const row = await (tx ?? this.prisma).user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: Email, tx?: Prisma.TransactionClient): Promise<User | null> {
    const row = await (tx ?? this.prisma).user.findUnique({ where: { email: email.value } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).user.create({ data: UserMapper.toPersistence(user) });
  }

  async update(user: User, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).user.update({
      where: { id: user.id },
      data: UserMapper.toPersistence(user),
    });
  }

  async findMany(input: { page: number; pageSize: number }, tx?: Prisma.TransactionClient): Promise<{ items: User[]; total: number }> {
    const client = tx ?? this.prisma;
    const [rows, total] = await Promise.all([
      client.user.findMany({
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      client.user.count(),
    ]);
    return { items: rows.map((r) => UserMapper.toDomain(r)), total };
  }

  async count(tx?: Prisma.TransactionClient): Promise<number> {
    return (tx ?? this.prisma).user.count();
  }
}
