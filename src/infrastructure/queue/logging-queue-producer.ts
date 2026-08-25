import { Injectable, Optional } from '@nestjs/common';
import type {
  QueueProducerPort,
  VerificationEmailPayload,
  ResetEmailPayload,
} from '@contexts/iam/application/ports/queue-producer.port';

export type LogFn = (message: string) => void;

// Plan 4 stand-in: logs the verification/reset link so dev flows are completable manually.
// Replaced by real BullMQ producers + nodemailer in Plan 7.
//
// `@Optional()` on `log` makes this class Nest-DI-safe under `useClass`: Nest reflects the
// `log: LogFn` param as `Function` and would try to inject a `Function` provider; `@Optional()`
// tells Nest to pass `undefined` instead, which triggers the JS default value, so `log` becomes
// the console logger. Direct construction (`new LoggingQueueProducer(fn)`) is unaffected —
// decorators don't change explicit-arg construction, so the unit test still passes a real fn.
@Injectable()
export class LoggingQueueProducer implements QueueProducerPort {
  constructor(@Optional() private readonly log: LogFn = (m) => console.log(`[queue] ${m}`)) {}

  async enqueueVerificationEmail(p: VerificationEmailPayload): Promise<void> {
    const url = `/verify-email?selector=${encodeURIComponent(p.tokenSelector)}&verifier=${encodeURIComponent(p.tokenVerifier)}`;
    this.log(`verification email to ${p.to}: ${url}`);
  }

  async enqueueResetEmail(p: ResetEmailPayload): Promise<void> {
    const url = `/reset-password?selector=${encodeURIComponent(p.tokenSelector)}&verifier=${encodeURIComponent(p.tokenVerifier)}`;
    this.log(`password-reset email to ${p.to}: ${url}`);
  }
}
