import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import globals from 'globals';

// noinspection JSUnusedGlobalSymbols
export default [
  js.configs.recommended,
  reactRecommended,
  stylistic.configs.customize({
    'semi': true,
    'braceStyle': '1tbs',
    'arrow-parens': 'always',
  }),
  {
    files: ['src/**/*.{js,jsx}', 'test/**/*.{js,jsx}', '*.{js,mjs}'],
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      // stylistic,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        BUILD_NUMBER: 'readonly',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
