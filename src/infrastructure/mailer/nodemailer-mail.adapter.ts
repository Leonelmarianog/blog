import { Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { MailPort } from '@contexts/iam/application/ports/mail.port';
import type { ConfigService } from '../../config/config.service';

/**
 * SMTP MailPort impl, selected when MAIL_DRIVER=smtp. Builds the transporter once at
 * construction; `sendMail` delegates to it with `from: MAIL_FROM`. Auth is omitted when
 * SMTP_USER is empty (Mailpit dev runs without auth).
 */
@Injectable()
export class NodemailerMailAdapter implements MailPort {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const user = config.get('SMTP_USER');
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get('SMTP_PORT'),
      secure: config.get('SMTP_SECURE'),
      ...(user ? { auth: { user, pass: config.get('SMTP_PASS') } } : {}),
    });
    this.from = config.get('MAIL_FROM');
  }

  async sendMail(input: { to: string; subject: string; html: string }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }
}
