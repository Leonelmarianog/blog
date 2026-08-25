import { RuleTester } from 'eslint';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';
import path from 'node:path';

// Regression test for the M3 port→application boundary tightening (Plan 4 Task 17).
//
// A port (context-application-port / kernel-application-port) must NOT import the
// non-port application layers (context-application / kernel-application). The
// allow-list for each port `from` rule drops those two element types, so a port
// file that imports a use-case / service under `application/**` (outside `ports/`)
// is flagged by `boundaries/element-types`.
//
// This test is SELF-CONTAINED: each case passes its own `options` (the tightened
// allow-list), so it does not depend on the repo's `eslint.config.mjs`. The
// imports MUST resolve to real files on disk (relative to the fixture
// `filename`'s directory) and classify to the intended element — an unresolvable
// import is treated as unrecognized → allowed → NOT flagged, which would make
// the invalid case pass vacuously. The chosen imports below resolve to real
// src/** files:
//   - '../commands/register.use-case' → src/contexts/iam/application/commands/register.use-case.ts
//     (classified as context-application → disallowed for a context-application-port source)
//   - './queue-producer.port' → src/contexts/iam/application/ports/queue-producer.port.ts
//     (classified as context-application-port self → allowed)
//   - '../use-case.base' → src/shared-kernel/application/use-case.base.ts
//     (classified as kernel-application → disallowed for a kernel-application-port source)
//
// The `settings.import/resolver` (typescript + node, with `extensions`) is
// mirrored verbatim from test/lint/boundaries.spec.ts so the resolver actually
// resolves — the typescript resolver maps @contexts/* / @kernel/* aliases via
// tsconfig.json, the node resolver resolves relative TypeScript paths. Both
// are required for classification to fire.
const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
  settings: {
    'import/resolver': {
      typescript: { project: path.resolve('tsconfig.json'), extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'] },
      node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'] },
    },
    // Port types are listed before their parent application type so that
    // src/.../application/ports/** files are classified as the more specific
    // *-port element (first matching pattern wins in eslint-plugin-boundaries).
    'boundaries/elements': [
      { type: 'kernel-application-port', pattern: 'src/shared-kernel/application/ports/**' },
      { type: 'kernel-application', pattern: 'src/shared-kernel/application/**' },
      { type: 'context-domain', pattern: 'src/contexts/*/domain/**' },
      { type: 'context-application-port', pattern: 'src/contexts/*/application/ports/**' },
      { type: 'context-application', pattern: 'src/contexts/*/application/**' },
      { type: 'kernel-domain', pattern: 'src/shared-kernel/domain/**' },
    ],
  },
});

ruleTester.run('element-types', boundaries.rules['element-types'], {
  valid: [
    {
      // A context-application-port may import a sibling port (same element type,
      // self-reference allowed). Resolves to the real queue-producer.port.ts.
      code: "import type { QueueProducerPort } from './queue-producer.port';\nexport type P = QueueProducerPort;",
      filename: 'src/contexts/iam/application/ports/user.repository.port.ts',
      options: [
        {
          default: 'disallow',
          rules: [
            { from: 'context-application-port', allow: ['context-domain', 'kernel-domain', 'context-application-port'] },
          ],
        },
      ],
    },
  ],
  invalid: [
    {
      // A context-application-port must NOT import context-application (the
      // inverted permissiveness M3 flagged). Resolves to the real
      // commands/register.use-case.ts → classified as context-application → flagged.
      code: "import { RegisterUseCase } from '../commands/register.use-case';\nexport const x = RegisterUseCase;",
      filename: 'src/contexts/iam/application/ports/user.repository.port.ts',
      options: [
        {
          default: 'disallow',
          rules: [
            { from: 'context-application-port', allow: ['context-domain', 'kernel-domain', 'context-application-port'] },
          ],
        },
      ],
      errors: [{ message: /No rule allowing this dependency was found/ }],
    },
    {
      // A kernel-application-port must NOT import kernel-application (non-port).
      // Resolves to the real shared-kernel/application/use-case.base.ts → classified
      // as kernel-application → flagged.
      code: "import { UseCase } from '../use-case.base';\nexport const x = UseCase;",
      filename: 'src/shared-kernel/application/ports/unit-of-work.port.ts',
      options: [
        {
          default: 'disallow',
          rules: [
            { from: 'kernel-application-port', allow: ['kernel-domain', 'kernel-application-port'] },
          ],
        },
      ],
      errors: [{ message: /No rule allowing this dependency was found/ }],
    },
  ],
});