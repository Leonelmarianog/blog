import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/', 'src/infrastructure/persistence/prisma/generated/', 'test/lint/fixtures/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node CommonJS config files (e.g. jest.config.js) need Node globals + CommonJS source.
    files: ['jest.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    settings: {
      // The boundaries plugin uses eslint-module-utils/resolve to map an import string to a
      // file path before classifying the target as an element. Two resolvers are wired:
      //  - `typescript` resolves the @kernel/*, @contexts/*, @infra/* path aliases declared in
      //    tsconfig.json (project: './tsconfig.json') so alias imports in src/ are classified
      //    and enforced. Without it a disallowed alias import (e.g. infrastructure ->
      //    @contexts/iam/domain) would slip through silently — the original gap this closes.
      //  - `node` (with .ts in extensions) resolves relative TypeScript imports as a fallback.
      'import/resolver': {
        typescript: { project: './tsconfig.json', extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'] },
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'] },
      },
      'boundaries/elements': [
        { type: 'composition-root', pattern: 'src/main.ts' },
        { type: 'composition-root', pattern: 'src/app.module.ts' },
        { type: 'kernel-domain', pattern: 'src/shared-kernel/domain/**' },
        // Port types must be listed before their parent application type so that
        // src/.../application/ports/** files are classified as the more specific
        // *-port element (the first matching pattern wins in eslint-plugin-boundaries).
        { type: 'kernel-application-port', pattern: 'src/shared-kernel/application/ports/**' },
        { type: 'kernel-application', pattern: 'src/shared-kernel/application/**' },
        { type: 'kernel-presentation', pattern: 'src/shared-kernel/presentation/**' },
        { type: 'context-domain', pattern: 'src/contexts/*/domain/**' },
        { type: 'context-application-port', pattern: 'src/contexts/*/application/ports/**' },
        { type: 'context-application', pattern: 'src/contexts/*/application/**' },
        { type: 'context-presentation', pattern: 'src/contexts/*/presentation/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
      ],
    },
    plugins: { boundaries },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // element-types governs production source only. Test files are not elements (every
    // element pattern is src/**) so they are exempt regardless, but scoping the rule to
    // src/** makes that explicit and avoids re-evaluating resolved alias imports under test/.
    files: ['src/**'],
    rules: {
      'boundaries/element-types': [
        'error',
        {
          // NOTE: the element types + rules here are mirrored in
          // test/lint/boundaries.spec.ts for the committed regression test.
          // Keep them in sync when editing.
          // Unrecognized dependencies (external packages, composition-root files) are allowed;
          // recognized-but-not-allowed dependencies are disallowed. Direction is enforced
          // by the explicit allow-lists below.
          //
          // Note: `default: 'disallow'` is required for the allow-lists to be authoritative.
          // The plugin only evaluates dependencies whose target is a recognized local element,
          // so external packages and unrecognized local files (composition-root) remain allowed
          // regardless. Each element type includes itself in its `allow` list so same-type
          // dependencies are permitted (the brief's `allowSameType: true` intent — that property
          // does not exist in eslint-plugin-boundaries v5, which rejects unknown properties).
          default: 'disallow',
          rules: [
            {
              from: 'composition-root',
              allow: [
                'composition-root',
                'kernel-domain',
                'kernel-application',
                'kernel-presentation',
                'context-domain',
                'context-application',
                'context-presentation',
                'infrastructure',
              ],
            },
            { from: 'kernel-domain', allow: ['kernel-domain'] },
            {
              from: 'kernel-application-port',
              allow: ['kernel-domain', 'kernel-application', 'kernel-application-port'],
            },
            { from: 'kernel-application', allow: ['kernel-domain', 'kernel-application'] },
            { from: 'kernel-presentation', allow: ['kernel-application', 'kernel-presentation'] },
            { from: 'context-domain', allow: ['kernel-domain', 'context-domain'] },
            {
              from: 'context-application-port',
              allow: [
                'context-domain',
                'kernel-domain',
                'kernel-application',
                'context-application',
                'context-application-port',
              ],
            },
            {
              from: 'context-application',
              allow: ['context-domain', 'kernel-domain', 'kernel-application', 'context-application'],
            },
            { from: 'context-presentation', allow: ['context-application', 'context-presentation'] },
            {
              from: 'infrastructure',
              allow: [
                'kernel-domain',
                'kernel-application',
                'kernel-application-port',
                'context-application-port',
                'infrastructure',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared-kernel/domain/**', 'src/contexts/*/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', 'express'],
              message: 'Domain layer must stay framework-agnostic (no NestJS/express).',
            },
          ],
        },
      ],
    },
  },
];
