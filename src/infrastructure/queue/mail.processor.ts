import { Injectable, Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { TEMPLATE_PORT } from '@contexts/iam/application/ports/template.port';
import type { TemplatePort } from '@contexts/iam/application/ports/template.port';
import { MAIL_PORT } from '@contexts/iam/application/ports/mail.port';
import type { MailPort } from '@contexts/iam/application/ports/mail.port';
import { ConfigService } from '../../config/config.service';
import type {
  VerificationEmailPayload,
  ResetEmailPayload,
} from '@contexts/iam/application/ports/queue-producer.port';

/**
 * BullMQ worker for the `mail` queue. Current @nestjs/bullmq requires a @Processor to extend
 * WorkerHost and implement a single `process(job)`; the two email kinds are dispatched by
 * `job.name` (`'verification'` / `'reset'`), preserving the spec's two-job-name intent. The
 * application layer never learns the public URL — use-cases pass raw selector/verifier and
 * the worker builds the absolute link from APP_URL. `sendMail`/`render` throws → BullMQ
 * retries (R11); on exhaustion the job lands in the failed set and `@OnWorkerEvent('failed')`
 * logs it. The worker process stays up (BullMQ isolates job failures).
 */
@Injectable()
@Processor('mail')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    @Inject(TEMPLATE_PORT) private readonly templates: TemplatePort,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'verification':
        return this.onVerification(job as Job<VerificationEmailPayload>);
      case 'reset':
        return this.onReset(job as Job<ResetEmailPayload>);
      default:
        throw new Error(`unknown mail job name: ${job.name}`);
    }
  }

  private async onVerification(job: Job<VerificationEmailPayload>): Promise<void> {
    const link = this.verifyLink(job.data);
    const { subject, html } = await this.templates.render('verification-email', { link });
    await this.mail.sendMail({ to: job.data.to, subject, html });
  }

  private async onReset(job: Job<ResetEmailPayload>): Promise<void> {
    const link = this.resetLink(job.data);
    const { subject, html } = await this.templates.render('reset-password-email', { link });
    await this.mail.sendMail({ to: job.data.to, subject, html });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error({ jobId: job?.id, name: job?.name, err: err.message }, 'mail job failed');
  }

  private verifyLink(p: VerificationEmailPayload): string {
    return `${this.config.get('APP_URL')}/verify-email?selector=${encodeURIComponent(p.tokenSelector)}&verifier=${encodeURIComponent(p.tokenVerifier)}`;
  }

  private resetLink(p: ResetEmailPayload): string {
    return `${this.config.get('APP_URL')}/reset-password?selector=${encodeURIComponent(p.tokenSelector)}&verifier=${encodeURIComponent(p.tokenVerifier)}`;
  }
}
