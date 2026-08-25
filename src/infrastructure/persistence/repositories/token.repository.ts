import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../prisma/client';
import { TokenMapper } from '../mappers/token.mapper';
import { Token } from '@contexts/iam/domain/token/token.entity';
import type { TokenRepositoryPort } from '@contexts/iam/application/ports/token.repository.port';

@Injectable()
export class PrismaTokenRepository implements TokenRepositoryPort<Prisma.TransactionClient> {
  constructor(private readonly prisma: PrismaService) {}

  async findBySelector(selector: string, tx?: Prisma.TransactionClient): Promise<Token | null> {
    const row = await (tx ?? this.prisma).token.findUnique({ where: { selector } });
    return row ? TokenMapper.toDomain(row) : null;
  }

  async save(token: Token, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).token.create({ data: TokenMapper.toPersistence(token) });
  }

  async update(token: Token, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).token.update({
      where: { selector: token.selector },
      data: TokenMapper.toPersistence(token),
    });
  }
}
