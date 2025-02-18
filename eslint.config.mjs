import globals from 'globals';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
    // Base configuration for JavaScript/TypeScript
    {
        files: ['**/*.{js,mjs,cjs,ts}'],
        languageOptions: {
            globals: {
                ...globals.node, // Node.js global variables
            },
            parser: tseslint.parser, // TypeScript parser
            parserOptions: {
                project: './tsconfig.json', // Point to your tsconfig
            },
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
        },
        rules: {
            ...js.configs.recommended.rules, // ESLint recommended rules
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' }, // Ignore unused vars starting with _
            ],
        },
    },
    // Ignore files/directories
    {
        ignores: ['node_modules/', 'cdk.out/', 'dist/', 'test/'],
    },
];
