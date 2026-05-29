import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default [
  // Vue files: only lint script blocks, not templates
  { files: ['**/*.vue'] },
  ...pluginVue.configs['flat/recommended'],
  { languageOptions: { parserOptions: { parser: '@typescript-eslint/parser' } } },
  {
    ignores: ['**/*.vue'], // Don't lint Vue template blocks (they cause parse errors)
    rules: { 'vue/no-multiple-template-root': 'off', 'vue/multi-word-component-names': 'warn' },
  },

  // JS/TS files
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.es2023 } },
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
];
