// ESLint : erreurs de logique et pièges courants, pas de règles de mise en forme.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['out/', 'media/vendor/', 'node_modules/', 'essai/'] },
  // Extension (Node)
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: {
      // Les transcripts sont du JSON libre : `any` y est assumé.
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
  // Monde 3D (navigateur, modules ES)
  {
    files: ['media/js/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.browser, acquireVsCodeApi: 'readonly' } },
  },
  // Scripts de construction (Node, CommonJS)
  {
    files: ['scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
  },
  {
    files: ['media/js/**/*.js', 'scripts/**/*.js'],
    rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }] },
  },
  {
    rules: {
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
);
