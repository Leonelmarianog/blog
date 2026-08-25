import { Entity, Identifier } from '@kernel/domain';
import type { UserId } from '../user/user.types';
import type { TokenId, TokenType } from './token.types';

export interface TokenProps {
  id: TokenId;
  type: TokenType;
  selector: string;
  verifierHash: string;
  userId: UserId;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface CreateTokenInput {
  type: TokenType;
  selector: string;
  verifierHash: string;
  userId: UserId;
  expiresAt: Date;
}

export class Token extends Entity<'Token'> {
  private _type: TokenType;
  private _selector: string;
  private _verifierHash: string;
  private _userId: UserId;
  private _expiresAt: Date;
  private _usedAt: Date | null;

  private constructor(props: TokenProps) {
    super(props.id);
    this._type = props.type;
    this._selector = props.selector;
    this._verifierHash = props.verifierHash;
    this._userId = props.userId;
    this._expiresAt = props.expiresAt;
    this._usedAt = props.usedAt;
  }

  static create(input: CreateTokenInput): Token {
    return new Token({
      id: Identifier.generate<'Token'>(),
      type: input.type,
      selector: input.selector,
      verifierHash: input.verifierHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
      usedAt: null,
    });
  }

  static fromPersistence(props: TokenProps): Token {
    return new Token(props);
  }

  get type(): TokenType { return this._type; }
  get selector(): string { return this._selector; }
  get verifierHash(): string { return this._verifierHash; }
  get userId(): UserId { return this._userId; }
  get expiresAt(): Date { return this._expiresAt; }
  get usedAt(): Date | null { return this._usedAt; }

  isExpired(now: Date): boolean {
    return now.getTime() >= this._expiresAt.getTime();
  }

  isUsed(): boolean {
    return this._usedAt !== null;
  }

  consume(now: Date): void {
    this._usedAt = now;
  }
}
