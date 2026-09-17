import { DomainEvent } from '@kernel/domain';
import type { SessionId } from '../session/session.types';

export class SessionRotated extends DomainEvent<'Session'> {
  constructor(sessionId: SessionId) {
    super(sessionId);
  }
}

export class SessionRevoked extends DomainEvent<'Session'> {
  constructor(sessionId: SessionId) {
    super(sessionId);
  }
}
