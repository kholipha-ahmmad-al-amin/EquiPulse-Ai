import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    // Scratch folder contains throwaway exploration scripts that
    // frequently contain non-parseable snippets (e.g. escaped quotes
    // in German strings). They are not part of the shipped product.
    'scratch/**',
    // Misc helper scripts outside the TS build pipeline.
    'scripts/check-match-tmp.cjs',
    'scripts/find-bad-json.mjs',
    'scripts/list-keys.mjs',
    'scripts/replace-selectors.js',
    'scripts/replace-selectors.mjs',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // These React Compiler rules are useful for compiler adoption, but the app
      // still uses ordinary subscription effects for Firebase and browser APIs.
      // We have not adopted the React Compiler yet, so its manual-memoization
      // guard is not a meaningful signal for us.
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/component-hook-factories': 'off',
    },
  },
])
