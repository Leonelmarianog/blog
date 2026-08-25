import { Injectable } from '@nestjs/common';
import type {
  QueueProducerPort,
  VerificationEmailPayload,
  ResetEmailPayload,
} from '@contexts/iam/application/ports/queue-producer.port';

export type LogFn = (message: string) => void;

// Plan 4 stand-in: logs the verification/reset link so dev flows are completable manually.
// Replaced by real BullMQ producers + nodemailer in Plan 7.
@Injectable()
export class LoggingQueueProducer implements QueueProducerPort {
  constructor(private readonly log: LogFn = (m) => console.log(`[queue] ${m}`)) {}

  async enqueueVerificationEmail(p: VerificationEmailPayload): Promise<void> {
    const url = `/verify-email?selector=${encodeURIComponent(p.tokenSelector)}&verifier=${encodeURIComponent(p.tokenVerifier)}`;
    this.log(`verification email to ${p.to}: ${url}`);
  }

  async enqueueResetEmail(p: ResetEmailPayload): Promise<void> {
    const url = `/reset-password?selector=${encodeURIComponent(p.tokenSelector)}&verifier=${encodeURIComponent(p.tokenVerifier)}`;
    this.log(`password-reset email to ${p.to}: ${url}`);
  }
}
