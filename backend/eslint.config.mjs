import onlyWarn from 'eslint-plugin-only-warn';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import recommended from 'eslint/conf/eslint-recommended';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  recommended,
  prettierRecommended,
  {
    languageOptions: {
      globals: {
        node: true,
        es2022: true,
        jest: true,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      'only-warn': onlyWarn,
      import: importPlugin,
      prettier: prettier,
    },
    rules: {
      'no-var': 'error',
      'no-extra-semi': 'error',
      'prefer-const': 'error',
      'no-console': ['warn'],
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'import/no-commonjs': 'error',
      indent: ['error', 2],
      camelcase: [
        'error',
        {
          properties: 'always',
          allow: ['skill_level', 'session_rate', 'user_id', 'foal_id', 'groom_id'],
        },
      ],
      'id-match': [
        'error',
        '^[a-zA-Z_][a-zA-Z0-9_]*$',
        {
          properties: false,
          onlyDeclarations: true,
          ignoreDestructuring: false,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='require']",
          message: 'Use import instead of require',
        },
        {
          selector: "MemberExpression[object.name='module'][property.name='exports']",
          message: 'Use export instead of module.exports',
        },
      ],
      'comma-dangle': ['error', 'always-multiline'],
      'object-curly-spacing': ['error', 'always'],
      'arrow-parens': ['error', 'as-needed'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
    ignores: ['node_modules', 'dist'],
  },
  {
    files: [
      '**/*.test.js',
      '**/*.spec.js',
      '**/*.test.mjs',
      '**/*.spec.mjs',
      'tests/**/*.js',
      'tests/**/*.mjs',
    ],
    languageOptions: {
      globals: {
        jest: true,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
];
