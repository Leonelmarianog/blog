export const TEMPLATE_PORT = Symbol('TEMPLATE_PORT');

export type MailTemplateName = 'verification-email' | 'reset-password-email';

export interface TemplatePort {
  render(name: MailTemplateName, vars: Record<string, string>): Promise<{ subject: string; html: string }>;
}
