import { fixupPluginRules } from '@eslint/compat'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import nextNext from '@next/eslint-plugin-next'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import formatjs from 'eslint-plugin-formatjs'
import _import from 'eslint-plugin-import'
import noOnlyTests from 'eslint-plugin-no-only-tests'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import localRules from './.eslintplugin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
})

export default [
	{
		ignores: [
			'**/node_modules/*',
			'**/out/*',
			'**/dist/*',
			'**/dist-cjs/*',
			'**/dist-esm/*',
			'**/.tsbuild*',
			'**/.lazy/*',
			'**/.next/*',
			'**/.wrangler/*',
			'**/.vercel/*',
			'**/*.md',
			'**/_archive/*',
			'**/*.css.map',
			'**/*.js.map',
			'**/*.d.ts',
			'**/api/*',
			'!**/pages/api/*',
			'**/*.json',
			'**/lazy.config.ts',
			'**/next.config.js',
			'**/setupTests.js',
			'**/setupJest.js',
			'**/jestResolver.js',
			'apps/vscode/extension/editor',
			'apps/examples/www',
			'apps/docs/api-content.json',
			'apps/docs/content.json',
			'apps/vscode/extension/editor/index.js',
			'apps/vscode/extension/editor/tldraw-assets.json',
			'**/sentry.server.config.js',
			'**/scripts/upload-sourcemaps.js',
			'**/scripts/lib/auto-plugin.js',
			'**/coverage/**/*',
			'apps/docs/postcss.config.js',
			'apps/docs/tailwind.config.js',
			'apps/dotcom/client/public/sw.js',
			'**/patchedJestJsDom.js',
			'**/.clasp.json',
			'**/*.mjs',
			'**/.*.js',
			'packages/assets/*',
		],
	},
	...compat.extends(
		'prettier',
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@next/next/core-web-vitals'
	),
	{
		plugins: {
			local: localRules,
			'@typescript-eslint': typescriptEslint,
			'no-only-tests': noOnlyTests,
			import: fixupPluginRules(_import),
			'@next/next': nextNext,
			react,
			'react-hooks': fixupPluginRules(reactHooks),
			formatjs: formatjs,
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: 5,
			sourceType: 'script',

			parserOptions: {
				project: true,
			},
		},

		settings: {
			next: {
				rootDir: ['apps/*/', 'packages/*/'],
			},
			react: {
				version: 'detect',
			},
		},

		rules: {
			'@next/next/no-html-link-for-pages': 'off',
			'no-non-null-assertion': 'off',
			'no-fallthrough': 'off',
			'react/jsx-no-target-blank': 'error',
			'react/react-in-jsx-scope': 'off',
			'@typescript-eslint/no-fallthrough': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/method-signature-style': ['error', 'method'],
			'@typescript-eslint/no-deprecated': 'error',
			'react/display-name': 'off',
			'@next/next/no-img-element': 'off',
			'react/prop-types': 'off',
			'@typescript-eslint/no-extra-semi': 'off',
			'no-mixed-spaces-and-tabs': 'off',

			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],

			'no-throw-literal': 'error',
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'error',
			'import/no-extraneous-dependencies': 'error',

			'@typescript-eslint/consistent-type-exports': [
				'error',
				{
					fixMixedExportsWithInlineTypeSpecifier: true,
				},
			],

			'local/no-export-star': 'error',
			'local/no-internal-imports': 'error',
			'local/tagged-components': 'error',
			'local/prefer-class-methods': 'error',
			'local/tsdoc-param-matching': 'error',
			'local/no-whilst': 'error',
			'no-only-tests/no-only-tests': 'error',
			'formatjs/enforce-default-message': ['error', 'literal'],

			'no-restricted-syntax': [
				'error',
				{
					selector: "MethodDefinition[kind='set']",
					message: 'Property setters are not allowed',
				},
				{
					selector: "MethodDefinition[kind='get']",
					message: 'Property getters are not allowed',
				},
				{
					selector: 'Identifier[name=localStorage]',
					message: 'Use the getFromLocalStorage/setInLocalStorage helpers instead',
				},
				{
					selector: 'Identifier[name=sessionStorage]',
					message: 'Use the getFromSessionStorage/setInSessionStorage helpers instead',
				},
				{
					selector:
						'ExportNamedDeclaration > VariableDeclaration[kind=const] > VariableDeclarator[init.type=ArrowFunctionExpression]',
					message: 'Use a function declaration instead of an arrow function here.',
				},
			],

			'no-restricted-globals': [
				'error',
				{
					name: 'structuredClone',
					message: 'Use structuredClone from @tldraw/util instead',
				},
			],

			'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
		},
	},
	{
		files: ['**/*.ts', '**/*.tsx'],

		rules: {
			'@typescript-eslint/explicit-module-boundary-types': [0],

			'no-console': [
				'error',
				{
					allow: ['warn', 'error'],
				},
			],
		},
	},
	{
		files: ['packages/editor/**/*', 'packages/tldraw/**/*', 'packages/utils/**/*'],

		rules: {
			'no-restricted-globals': [
				'error',
				{
					name: 'fetch',
					message: 'Use the fetch from @tldraw/util instead.',
				},
				{
					name: 'Image',
					message: 'Use the Image from @tldraw/util instead.',
				},
				{
					name: 'setTimeout',
					message: 'Use the timers from editor.timers instead.',
				},
				{
					name: 'setInterval',
					message: 'Use the timers from editor.timers instead.',
				},
				{
					name: 'requestAnimationFrame',
					message: 'Use the timers from editor.timers instead.',
				},
				{
					name: 'structuredClone',
					message: 'Use structuredClone from @tldraw/util instead',
				},
			],

			'no-restricted-properties': [
				'error',
				{
					object: 'window',
					property: 'fetch',
					message: 'Use the fetch from @tldraw/util instead.',
				},
				{
					object: 'window',
					property: 'Image',
					message: 'Use the Image from @tldraw/util instead.',
				},
				{
					object: 'window',
					property: 'setTimeout',
					message: 'Use the timers from editor.timers instead.',
				},
				{
					object: 'window',
					property: 'setInterval',
					message: 'Use the timers from editor.timers instead.',
				},
				{
					object: 'window',
					property: 'requestAnimationFrame',
					message: 'Use the timers from editor.timers instead.',
				},
			],

			'no-restricted-syntax': [
				'error',
				{
					selector: "MethodDefinition[kind='set']",
					message: 'Property setters are not allowed',
				},
				{
					selector: "MethodDefinition[kind='get']",
					message: 'Property getters are not allowed',
				},
				{
					selector: 'Identifier[name=localStorage]',
					message: 'Use the getFromLocalStorage/setInLocalStorage helpers instead',
				},
				{
					selector: 'Identifier[name=sessionStorage]',
					message: 'Use the getFromSessionStorage/setInSessionStorage helpers instead',
				},
				{
					selector:
						"JSXElement[openingElement.name.name='img']:not(:has(JSXAttribute[name.name='referrerPolicy']))",
					message: 'You must pass `referrerPolicy` when creating an <img>.',
				},
			],
		},
	},
	{
		files: ['apps/dotcom/client/**/*'],

		rules: {
			'no-restricted-globals': [
				'error',
				{
					name: 'fetch',
					message: 'Use the fetch from @tldraw/util instead.',
				},
				{
					name: 'Image',
					message: 'Use the Image from @tldraw/util instead.',
				},
				{
					name: 'structuredClone',
					message: 'Use structuredClone from @tldraw/util instead',
				},
			],
			'no-restricted-properties': [
				'error',
				{
					object: 'window',
					property: 'fetch',
					message: 'Use the fetch from @tldraw/util instead.',
				},
				{
					object: 'window',
					property: 'Image',
					message: 'Use the Image from @tldraw/util instead.',
				},
				{
					object: 'crypto',
					property: 'randomUUID',
					message: 'Please use the makeUUID util instead.',
				},
			],
		},
	},
	{
		files: ['apps/dotcom/client/src/tla/**/*'],

		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'react-intl',
							message: 'Please import useIntl from src/utils/intl instead.',
						},
					],
				},
			],
			'react/jsx-no-literals': [
				'error',
				{
					noStrings: true,
					ignoreProps: true,
				},
			],
		},
	},
	{
		files: ['**/scripts/**/*'],

		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
	{
		files: ['internal/scripts/**/*'],

		rules: {
			'import/no-extraneous-dependencies': 'off',
		},
	},
	{
		files: ['apps/examples/**/*'],

		rules: {
			'no-restricted-syntax': 'off',
			'local/no-at-internal': 'error',
		},
	},
	{
		files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],

		rules: {
			'no-restricted-properties': 'off',
			'no-restricted-globals': 'off',
			'react/jsx-key': 'off',
			'react/no-string-refs': 'off',
			'local/no-at-internal': 'off',
		},
	},
	{
		files: ['internal/**/*', 'templates/simple-server-example/**/*'],

		rules: {
			'no-console': 'off',
		},
	},
]
