import { Linter } from 'eslint';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';
import path from 'node:path';

const linter = new Linter();

// NOTE: the element types + rules here are mirrored in eslint.config.mjs.
// Keep them in sync when editing. The config is expressed in ESLint v9 flat
// config form (languageOptions.parser, files: ['**']) so the Linter API can
// classify both the source filename and the resolved import target.
const config = {
  files: ['**'],
  plugins: { boundaries },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { sourceType: 'module' },
  },
  settings: {
    'import/resolver': { node: { extensions: ['.ts', '.js', '.json'] } },
    'boundaries/elements': [
      { type: 'composition-root', pattern: 'src/main.ts' },
      { type: 'composition-root', pattern: 'src/app.module.ts' },
      { type: 'kernel-domain', pattern: 'src/shared-kernel/domain/**' },
      { type: 'kernel-application', pattern: 'src/shared-kernel/application/**' },
      { type: 'kernel-application-port', pattern: 'src/shared-kernel/application/ports/**' },
      { type: 'kernel-presentation', pattern: 'src/shared-kernel/presentation/**' },
      { type: 'context-domain', pattern: 'src/contexts/*/domain/**' },
      { type: 'context-application', pattern: 'src/contexts/*/application/**' },
      { type: 'context-application-port', pattern: 'src/contexts/*/application/ports/**' },
      { type: 'context-presentation', pattern: 'src/contexts/*/presentation/**' },
      { type: 'infrastructure', pattern: 'src/infrastructure/**' },
    ],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          { from: 'composition-root', allow: ['composition-root', 'kernel-domain', 'kernel-application', 'kernel-presentation', 'context-domain', 'context-application', 'context-presentation', 'infrastructure'] },
          { from: 'kernel-domain', allow: ['kernel-domain'] },
          { from: 'kernel-application', allow: ['kernel-domain', 'kernel-application'] },
          { from: 'kernel-presentation', allow: ['kernel-application', 'kernel-presentation'] },
          { from: 'context-domain', allow: ['kernel-domain', 'context-domain'] },
          { from: 'context-application', allow: ['context-domain', 'kernel-domain', 'kernel-application', 'context-application'] },
          { from: 'context-presentation', allow: ['context-application', 'context-presentation'] },
          { from: 'infrastructure', allow: ['kernel-domain', 'kernel-application', 'context-application-port', 'infrastructure'] },
        ],
      },
    ],
  },
};

// Each fixture filename is chosen to match the `from` element's src/** pattern
// (so the source is classified) and to place the relative import at the right
// depth to resolve into src/** (so the target is classified). The on-disk
// fixture files under test/lint/fixtures/ mirror these snippets for
// documentation but are git-ignored from linting.
function lintFixture(filename: string, code: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return linter.verify(code, [config] as any, path.resolve(filename));
}

describe('boundary rules', () => {
  it('disallows infrastructure -> context-domain', () => {
    const code = `import type { Identifier } from '../../contexts/iam/domain/user/user.types';\nexport type X = Identifier<'User'>;`;
    const messages = lintFixture('src/infrastructure/persistence/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });

  it('disallows kernel-domain -> kernel-application', () => {
    const code = `import { UseCase } from '../application/use-case.base';\nexport class Bad extends UseCase<never, never> { async execute() { return { ok: true, value: undefined as never }; } }`;
    const messages = lintFixture('src/shared-kernel/domain/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });

  it('allows infrastructure -> kernel-application port', () => {
    const code = `import type { UnitOfWorkPort } from '../../shared-kernel/application/ports/unit-of-work.port';\nexport type UoW = UnitOfWorkPort<unknown>;`;
    const messages = lintFixture('src/infrastructure/persistence/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows composition-root -> infrastructure', () => {
    const code = `import { PersistenceModule } from './infrastructure/persistence/persistence.module';\nexport const m = PersistenceModule;`;
    const messages = lintFixture('src/app.module.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });
});
