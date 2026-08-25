import { DomainEvent } from '@kernel/domain';
import type { SessionId } from '../session/session.types';

export class SessionRotated extends DomainEvent {
  constructor(sessionId: SessionId) {
    super(sessionId);
  }
}

export class SessionRevoked extends DomainEvent {
  constructor(sessionId: SessionId) {
    super(sessionId);
  }
}
