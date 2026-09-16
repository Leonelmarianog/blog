import { HandlebarsTemplateAdapter } from '@infra/mailer/handlebars-template.adapter';

describe('HandlebarsTemplateAdapter', () => {
  it('renders the verification email with subject parsed from the template comment', async () => {
    const adapter = new HandlebarsTemplateAdapter();
    const { subject, html } = await adapter.render('verification-email', { link: 'https://app.test/verify?x=1' });
    expect(subject).toBe('Verify your email');
    expect(html).toContain('https://app.test/verify?x=1');
  });

  it('renders the reset-password email with subject parsed from the template comment', async () => {
    const adapter = new HandlebarsTemplateAdapter();
    const { subject, html } = await adapter.render('reset-password-email', { link: 'https://app.test/reset?x=1' });
    expect(subject).toBe('Reset your password');
    expect(html).toContain('https://app.test/reset?x=1');
  });

  it('throws on an unknown template name', async () => {
    const adapter = new HandlebarsTemplateAdapter();
    await expect(adapter.render('nope' as never, {})).rejects.toThrow(/unknown template/);
  });
});
