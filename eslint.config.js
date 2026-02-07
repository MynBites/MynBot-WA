import eslint from '@eslint/js'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
  eslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        describe: 'readonly',
        it: 'readonly',
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      semi: ['error', 'never'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prettier/prettier': 'error',
      'no-empty-pattern': 'warn',
      'no-setter-return': 'off', // Allow setter returns for property definitions
    },
  },
  {
    ignores: ['node_modules', 'sessions', '*.log', '.vscode', 'dist', 'build', 'coverage'],
  },
]
