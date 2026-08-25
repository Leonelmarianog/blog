import { Entity, Identifier } from '@kernel/domain';
import type { UserId } from '../user/user.types';
import type { SessionId } from './session.types';
import { SessionRotated, SessionRevoked } from '../events/session-events';

export interface SessionProps {
  id: SessionId;
  userId: UserId;
  seriesHash: string;
  tokenHash: string;
  expiresAt: Date;
  rotatedAt: Date;
}

export interface CreateSessionInput {
  userId: UserId;
  seriesHash: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
}

export class Session extends Entity<'Session'> {
  private _userId: UserId;
  private _seriesHash: string;
  private _tokenHash: string;
  private _expiresAt: Date;
  private _rotatedAt: Date;

  private constructor(props: SessionProps) {
    super(props.id);
    this._userId = props.userId;
    this._seriesHash = props.seriesHash;
    this._tokenHash = props.tokenHash;
    this._expiresAt = props.expiresAt;
    this._rotatedAt = props.rotatedAt;
  }

  static create(input: CreateSessionInput): Session {
    return new Session({
      id: Identifier.generate<'Session'>(),
      userId: input.userId,
      seriesHash: input.seriesHash,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      rotatedAt: input.now,
    });
  }

  static fromPersistence(props: SessionProps): Session {
    return new Session(props);
  }

  get userId(): UserId { return this._userId; }
  get seriesHash(): string { return this._seriesHash; }
  get tokenHash(): string { return this._tokenHash; }
  get expiresAt(): Date { return this._expiresAt; }
  get rotatedAt(): Date { return this._rotatedAt; }

  isExpired(now: Date): boolean {
    return now.getTime() >= this._expiresAt.getTime();
  }

  isForSeries(seriesHash: string): boolean {
    return this._seriesHash === seriesHash;
  }

  matchesToken(tokenHash: string): boolean {
    return this._tokenHash === tokenHash;
  }

  rotate(tokenHash: string, now: Date): void {
    this._tokenHash = tokenHash;
    this._rotatedAt = now;
    this.addDomainEvent(new SessionRotated(this.id));
  }

  revoke(): void {
    this.addDomainEvent(new SessionRevoked(this.id));
  }
}
