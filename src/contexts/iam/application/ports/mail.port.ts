export interface MailPort {
  sendMail(input: { to: string; subject: string; html: string }): Promise<void>;
}
