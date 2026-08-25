export const QUEUE_PRODUCER = Symbol('QUEUE_PRODUCER');

export interface VerificationEmailPayload {
  userId: string;
  to: string;
  tokenSelector: string;
  tokenVerifier: string;
}

export interface ResetEmailPayload {
  userId: string;
  to: string;
  tokenSelector: string;
  tokenVerifier: string;
}

export interface QueueProducerPort {
  enqueueVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
  enqueueResetEmail(payload: ResetEmailPayload): Promise<void>;
}
