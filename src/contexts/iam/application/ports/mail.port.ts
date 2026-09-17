export const MAIL_PORT = Symbol('MAIL_PORT');

export interface MailPort {
  sendMail(input: { to: string; subject: string; html: string }): Promise<void>;
}
