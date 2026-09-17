import { Identifier } from '@kernel/domain/identifier';
import { UserRegistered } from '@contexts/iam/domain/events/user-events';
import type { UserId } from '@contexts/iam/domain/user/user.types';
import type { SessionId } from '@contexts/iam/domain/session/session.types';

describe('DomainEvent branding', () => {
  it('round-trips the aggregate id and stamps an occurredAt date', () => {
    const userId: UserId = Identifier.from<'User'>('user-1');
    const event = new UserRegistered(userId);
    expect(event.aggregateId).toBe(userId);
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('rejects an id branded for a different aggregate at compile time', () => {
    const sessionId: SessionId = Identifier.from<'Session'>('session-1');
    // Compile-time assertion: a User event only accepts a User-branded id.
    // Before the base is generic, this line compiles (SessionId is assignable to
    // Identifier<string>), so @ts-expect-error is unused and TS2578 fails the file.
    // @ts-expect-error a User event only accepts a User-branded id
    new UserRegistered(sessionId);
    // Satisfy jest's assertion counter for a compile-time-only assertion.
    expect(true).toBe(true);
  });
});
