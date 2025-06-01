module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['import', 'prettier'],
  rules: {
    'no-var': 'error',
    'no-extra-semi': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['**/*.test.js', '**/*.spec.js', '**/tests/**'],
        optionalDependencies: false,
        peerDependencies: false
      }
    ],
    'import/no-unresolved': 'error',
    'import/default': 'error',
    'import/named': 'error',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'always',
        mjs: 'always',
        jsx: 'never'
      }
    ],
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
    indent: ['error', 2],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'arrow-parens': ['error', 'as-needed'],
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'prettier/prettier': 'error'
  },
  overrides: [
    {
      files: ['backend/**/*.js'],
      env: {
        node: true,
        jest: true
      }
    }
  ]
};
