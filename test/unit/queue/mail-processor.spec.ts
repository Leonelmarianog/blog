import type { Job } from 'bullmq';
import { MailProcessor } from '@infra/queue/mail.processor';
import type { TemplatePort, MailTemplateName } from '@contexts/iam/application/ports/template.port';
import type { MailPort } from '@contexts/iam/application/ports/mail.port';
import type { ConfigService } from '../../../src/config/config.service';

function fakeConfig(appUrl: string): ConfigService {
  return { get: (key: string) => ({ APP_URL: appUrl } as Record<string, string>)[key] } as unknown as ConfigService;
}

function fakeTemplates(): TemplatePort & { calls: { name: MailTemplateName; vars: Record<string, string> }[] } {
  const calls: { name: MailTemplateName; vars: Record<string, string> }[] = [];
  return {
    calls,
    async render(name: MailTemplateName, vars: Record<string, string>) {
      calls.push({ name, vars });
      return { subject: `Subject:${name}`, html: `<p>${vars.link}</p>` };
    },
  } as unknown as TemplatePort & { calls: typeof calls };
}

function fakeMail(): MailPort & { sendMail: jest.Mock } {
  return { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as MailPort & { sendMail: jest.Mock };
}

describe('MailProcessor', () => {
  it('processes a verification job: renders verification-email with APP_URL link, sends mail', async () => {
    const templates = fakeTemplates();
    const mail = fakeMail();
    const processor = new MailProcessor(templates, mail, fakeConfig('http://app.test'));

    await processor.process({ name: 'verification', data: {
      userId: 'u1', to: 'a@b.com', tokenSelector: 'sel', tokenVerifier: 'ver',
    } } as Job);

    expect(templates.calls).toEqual([{ name: 'verification-email', vars: {
      link: 'http://app.test/verify-email?selector=sel&verifier=ver',
    } }]);
    expect(mail.sendMail).toHaveBeenCalledWith({
      to: 'a@b.com', subject: 'Subject:verification-email', html: '<p>http://app.test/verify-email?selector=sel&verifier=ver</p>',
    });
  });

  it('processes a reset job: renders reset-password-email with APP_URL link, sends mail', async () => {
    const templates = fakeTemplates();
    const mail = fakeMail();
    const processor = new MailProcessor(templates, mail, fakeConfig('http://app.test'));

    await processor.process({ name: 'reset', data: {
      userId: 'u1', to: 'a@b.com', tokenSelector: 'rsel', tokenVerifier: 'rver',
    } } as Job);

    expect(templates.calls[0]).toEqual({ name: 'reset-password-email', vars: {
      link: 'http://app.test/reset-password?selector=rsel&verifier=rver',
    } });
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com' }));
  });

  it('throws on an unknown job name (so BullMQ marks the job failed)', async () => {
    const processor = new MailProcessor(fakeTemplates(), fakeMail(), fakeConfig('http://app.test'));
    await expect(processor.process({ name: 'bogus', data: {} } as Job)).rejects.toThrow(/unknown mail job name/);
  });

  it('rethrows a sendMail rejection (so BullMQ retries)', async () => {
    const mail = fakeMail();
    mail.sendMail.mockRejectedValueOnce(new Error('smtp down'));
    const processor = new MailProcessor(fakeTemplates(), mail, fakeConfig('http://app.test'));
    await expect(processor.process({ name: 'verification', data: {
      userId: 'u1', to: 'a@b.com', tokenSelector: 's', tokenVerifier: 'v',
    } } as Job)).rejects.toThrow('smtp down');
  });
});
