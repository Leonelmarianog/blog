import type { DomainEvent } from '@kernel/domain';
import type { UnitOfWorkPort, EventCollector } from '@kernel/application';
import type { User } from '@contexts/iam/domain/user/user.aggregate';
import { Email } from '@contexts/iam/domain/user/email.vo';
import type { UserId } from '@contexts/iam/domain/user/user.types';
import type { Session } from '@contexts/iam/domain/session/session.entity';
import type { SessionId } from '@contexts/iam/domain/session/session.types';
import type { Token } from '@contexts/iam/domain/token/token.entity';
import type {
  UserRepositoryPort,
  SessionRepositoryPort,
  TokenRepositoryPort,
  PasswordHasherPort,
  TokenHasherPort,
  QueueProducerPort,
  VerificationEmailPayload,
  ResetEmailPayload,
} from '@contexts/iam/application/ports';

/**
 * Test-data helper: build a known-valid `Email` without discriminant-narrowing
 * boilerplate. `Email.create` returns a `Result` (a discriminated union), so
 * accessing `.value` directly is a type error under ts-jest; this narrows and
 * throws on invalid input (a fixture bug, not a test assertion). Reused by every
 * use-case test that seeds a `User`.
 */
export function email(value: string): Email {
  const r = Email.create(value);
  if (!r.ok) throw new Error(`fixture: invalid email "${value}"`);
  return r.value;
}

export class InMemoryUserRepository implements UserRepositoryPort {
  private byId = new Map<string, User>();
  private byEmail = new Map<string, User>();
  async findById(id: UserId): Promise<User | null> { return this.byId.get(id) ?? null; }
  async findByEmail(email: Email): Promise<User | null> { return this.byEmail.get(email.value) ?? null; }
  async save(user: User): Promise<void> { this.store(user); }
  async update(user: User): Promise<void> { this.store(user); }
  private store(user: User): void {
    this.byId.set(user.id, user);
    this.byEmail.set(user.email.value, user);
  }
}

export class InMemorySessionRepository implements SessionRepositoryPort {
  private byId = new Map<string, Session>();
  private bySeries = new Map<string, Session>();
  async findById(id: SessionId): Promise<Session | null> { return this.byId.get(id) ?? null; }
  async findBySeriesHash(seriesHash: string): Promise<Session | null> { return this.bySeries.get(seriesHash) ?? null; }
  async findByUserId(userId: UserId): Promise<Session[]> {
    return [...this.byId.values()].filter((s) => s.userId === userId);
  }
  async save(session: Session): Promise<void> { this.store(session); }
  async update(session: Session): Promise<void> { this.store(session); }
  async delete(id: SessionId): Promise<void> {
    const s = this.byId.get(id);
    if (s) this.bySeries.delete(s.seriesHash);
    this.byId.delete(id);
  }
  async deleteByUserId(userId: UserId): Promise<void> {
    for (const s of [...this.byId.values()]) {
      if (s.userId === userId) { this.bySeries.delete(s.seriesHash); this.byId.delete(s.id); }
    }
  }
  private store(session: Session): void {
    this.byId.set(session.id, session);
    this.bySeries.set(session.seriesHash, session);
  }
}

export class InMemoryTokenRepository implements TokenRepositoryPort {
  private bySelector = new Map<string, Token>();
  async findBySelector(selector: string): Promise<Token | null> { return this.bySelector.get(selector) ?? null; }
  async save(token: Token): Promise<void> { this.bySelector.set(token.selector, token); }
  async update(token: Token): Promise<void> { this.bySelector.set(token.selector, token); }
}

export class FakePasswordHasher implements PasswordHasherPort {
  async hash(password: string): Promise<string> { return `hashed:${password}`; }
  async verify(password: string, hash: string): Promise<boolean> { return hash === `hashed:${password}`; }
}

export class FakeTokenHasher implements TokenHasherPort {
  hash(value: string): string { return `sha:${value}`; }
  verify(value: string, hash: string): boolean { return hash === `sha:${value}`; }
}

export class FakeQueueProducer implements QueueProducerPort {
  verificationEmails: VerificationEmailPayload[] = [];
  resetEmails: ResetEmailPayload[] = [];
  async enqueueVerificationEmail(payload: VerificationEmailPayload): Promise<void> { this.verificationEmails.push(payload); }
  async enqueueResetEmail(payload: ResetEmailPayload): Promise<void> { this.resetEmails.push(payload); }
}

/**
 * Fake UoW: executes the work immediately (no real transaction), then gathers
 * each collected aggregate's domain events into `dispatched` and clears them —
 * mirroring PrismaUnitOfWork's post-commit dispatch. `tx` is `undefined` (fakes
 * ignore it). Use `uow.dispatched` to assert events were emitted.
 */
export class FakeUnitOfWork implements UnitOfWorkPort<unknown> {
  private aggregates: EventCollector[] = [];
  dispatched: DomainEvent[] = [];
  collect(aggregate: EventCollector): void { this.aggregates.push(aggregate); }
  async run<T>(work: (tx: unknown) => Promise<T>): Promise<T> {
    const result = await work(undefined);
    this.dispatched = this.aggregates.flatMap((a) => [...a.domainEvents]);
    for (const a of this.aggregates) a.clearDomainEvents();
    this.aggregates = [];
    return result;
  }
}
