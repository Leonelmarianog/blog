import nodemailer from 'nodemailer';
import { NodemailerMailAdapter } from '@infra/mailer/nodemailer-mail.adapter';
import type { ConfigService } from '../../../src/config/config.service';

function fakeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  return {
    get: (key: string) =>
      ({
        MAIL_DRIVER: 'smtp',
        SMTP_HOST: 'smtp.test',
        SMTP_PORT: 1025,
        SMTP_SECURE: false,
        SMTP_USER: '',
        SMTP_PASS: '',
        MAIL_FROM: 'no-reply@blog.test',
        ...overrides,
      })[key],
  } as unknown as ConfigService;
}

describe('NodemailerMailAdapter', () => {
  it('sends mail via a nodemailer transporter with from=MAIL_FROM', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as never);

    const adapter = new NodemailerMailAdapter(fakeConfig());
    await adapter.sendMail({ to: 'user@test', subject: 'Hi', html: '<p>x</p>' });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.test',
        port: 1025,
        secure: false,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: 'no-reply@blog.test',
      to: 'user@test',
      subject: 'Hi',
      html: '<p>x</p>',
    });
  });

  it('omits auth when SMTP_USER is empty', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    const spy = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as never);

    new NodemailerMailAdapter(fakeConfig({ SMTP_USER: '' }));
    expect(spy).toHaveBeenCalledWith(expect.not.objectContaining({ auth: expect.anything() }));
  });
});
