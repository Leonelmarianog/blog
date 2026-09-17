import { Injectable, Logger } from '@nestjs/common';
import type { MailPort } from '@contexts/iam/application/ports/mail.port';

/**
 * Dev fallback MailPort (MAIL_DRIVER=log) and the successor to LoggingQueueProducer's
 * "log the link" role. Never throws — every job succeeds in dev with no SMTP (R5).
 */
@Injectable()
export class LogMailAdapter implements MailPort {
  private readonly logger = new Logger(LogMailAdapter.name);

  async sendMail(input: { to: string; subject: string; html: string }): Promise<void> {
    this.logger.log({ to: input.to, subject: input.subject, html: input.html }, 'mail (log driver)');
  }
}
