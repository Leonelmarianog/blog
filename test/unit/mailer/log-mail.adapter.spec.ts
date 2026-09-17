import { Logger } from '@nestjs/common';
import { LogMailAdapter } from '@infra/mailer/log-mail.adapter';

describe('LogMailAdapter', () => {
  it('logs to/subject/html and never throws', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const adapter = new LogMailAdapter();
    await expect(adapter.sendMail({ to: 'a@b', subject: 'Hi', html: '<p>x</p>' })).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
