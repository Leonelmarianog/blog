import { Global, Module } from '@nestjs/common';
import { MAIL_PORT } from '@contexts/iam/application/ports/mail.port';
import { TEMPLATE_PORT } from '@contexts/iam/application/ports/template.port';
import type { MailPort } from '@contexts/iam/application/ports/mail.port';
import { ConfigService } from '../../config/config.service';
import { NodemailerMailAdapter } from './nodemailer-mail.adapter';
import { LogMailAdapter } from './log-mail.adapter';
import { HandlebarsTemplateAdapter } from './handlebars-template.adapter';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailPort =>
        config.get('MAIL_DRIVER') === 'smtp' ? new NodemailerMailAdapter(config) : new LogMailAdapter(),
    },
    { provide: TEMPLATE_PORT, useClass: HandlebarsTemplateAdapter },
  ],
  exports: [MAIL_PORT, TEMPLATE_PORT],
})
export class MailerModule {}
