import { Injectable } from '@nestjs/common';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import type { TemplatePort, MailTemplateName } from '@contexts/iam/application/ports/template.port';

interface CompiledTemplate {
  subject: string;
  body: Handlebars.TemplateDelegate;
}

const SUBJECT_RE = /{{!--\s*subject:\s*"([^"]+)"\s*--}}/;

/**
 * Renders email templates co-located under `infrastructure/mailer/templates/` (R6/R12).
 * The subject is parsed from a leading `{{!-- subject: "..." --}}` comment so one file holds
 * subject + body with no separate manifest. `__dirname` resolves to `dist/infrastructure/mailer`
 * after build (where the `*.hbs` asset rule copies templates) and to `src/infrastructure/mailer`
 * under ts-jest, so both paths find the templates. `render` awaits the load promise so a job
 * arriving during construction cannot race the load.
 */
@Injectable()
export class HandlebarsTemplateAdapter implements TemplatePort {
  private readonly templates = new Map<MailTemplateName, CompiledTemplate>();
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    const dir = join(__dirname, 'templates');
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.hbs')) continue;
      const name = file.replace(/\.hbs$/, '') as MailTemplateName;
      const raw = await readFile(join(dir, file), 'utf8');
      const match = raw.match(SUBJECT_RE);
      if (!match) throw new Error(`template ${file} missing subject comment`);
      const bodySrc = raw.replace(SUBJECT_RE, '').trimStart();
      this.templates.set(name, { subject: match[1], body: Handlebars.compile(bodySrc) });
    }
  }

  async render(
    name: MailTemplateName,
    vars: Record<string, string>,
  ): Promise<{ subject: string; html: string }> {
    await this.ready;
    const tpl = this.templates.get(name);
    if (!tpl) throw new Error(`unknown template: ${name}`);
    return { subject: tpl.subject, html: tpl.body(vars) };
  }
}
