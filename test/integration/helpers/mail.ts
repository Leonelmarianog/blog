import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

export interface MailpitMessage {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

const apiBase = (): string => {
  if (!process.env.MAILPIT_API_URL) throw new Error('MAILPIT_API_URL not set');
  return process.env.MAILPIT_API_URL;
};

export async function getMessages(): Promise<MailpitMessage[]> {
  const res = await fetch(`${apiBase()}/api/v1/messages`);
  if (!res.ok) throw new Error(`mailpit getMessages ${res.status}`);
  const body = (await res.json()) as { messages: MailpitMessage[] };
  return body.messages ?? [];
}

export async function getMessageBody(id: string): Promise<string> {
  // The single-message endpoint is SINGULAR (`/api/v1/message/:id`); the plural form 404s.
  // The decoded HTML is in the JSON message object's `HTML` field (not the `/raw` bytes).
  const res = await fetch(`${apiBase()}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`mailpit getMessageBody ${res.status}`);
  const body = (await res.json()) as { HTML?: string };
  return body.HTML ?? '';
}

export async function clearMailbox(): Promise<void> {
  const res = await fetch(`${apiBase()}/api/v1/messages`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`mailpit clearMailbox ${res.status}`);
}

/**
 * Polls Mailpit until a message to `to` with a subject matching `/subject/` arrives, or throws
 * after `timeoutMs`. On timeout, dumps BullMQ's failed-jobs set for the `mail` queue (via the
 * worker app's Queue) so template/sendMail failures are debuggable. Pass the worker app so the
 * failed set is inspectable; pass undefined only when no worker is booted.
 */
export async function waitForEmailTo(
  to: string,
  opts: { subject: RegExp; timeoutMs?: number; workerApp?: INestApplication },
): Promise<MailpitMessage> {
  const { subject, timeoutMs = 3000, workerApp } = opts;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const msgs = await getMessages();
    const hit = msgs.find((m) => {
      if (!subject.test(m.Subject)) return false;
      const toField = m.To as unknown;
      return Array.isArray(toField)
        ? toField.some((a) => (a as { Address?: string }).Address === to)
        : String(toField).includes(to);
    });
    if (hit) return hit;
    if (Date.now() > deadline) {
      let failedDump = '';
      if (workerApp) {
        try {
          const queue = workerApp.get<Queue>(getQueueToken('mail'));
          const failed = await queue.getFailed();
          failedDump = failed.map((j) => `#${j.id} ${j.name}: ${j.failedReason}`).join('\n');
        } catch {
          /* ignore — diagnostics only */
        }
      }
      throw new Error(`no email to ${to} matching ${subject} within ${timeoutMs}ms\nFailed jobs:\n${failedDump}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}
