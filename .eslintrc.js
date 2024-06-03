module.exports = {
	extends: [
		'prettier',
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@next/next/core-web-vitals',
	],
	ignorePatterns: [],
	plugins: [
		'@typescript-eslint',
		'no-only-tests',
		'import',
		'local',
		'@next/next',
		'react-hooks',
		'deprecation',
	],
	settings: {
		next: {
			rootDir: ['apps/*/', 'packages/*/'],
		},
	},
	rules: {
		'deprecation/deprecation': 'error',
		'@next/next/no-html-link-for-pages': 'off',
		'react/jsx-key': 'off',
		'no-non-null-assertion': 'off',
		'no-fallthrough': 'off',
		'@typescript-eslint/no-fallthrough': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'react/display-name': 'off',
		'@next/next/no-img-element': 'off',
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
			{ fixMixedExportsWithInlineTypeSpecifier: true },
		],
		'local/no-export-star': 'error',
		'local/no-internal-imports': 'error',
		'no-only-tests/no-only-tests': 'error',
		'no-restricted-syntax': [
			'error',
			{ selector: "MethodDefinition[kind='set']", message: 'Property setters are not allowed' },
			{ selector: "MethodDefinition[kind='get']", message: 'Property getters are not allowed' },
			{
				selector: 'Identifier[name=localStorage]',
				message: 'Use the getFromLocalStorage/setInLocalStorage helpers instead',
			},
			{
				selector: 'Identifier[name=sessionStorage]',
				message: 'Use the getFromSessionStorage/setInSessionStorage helpers instead',
			},
		],
		'no-restricted-globals': [
			'error',
			{ name: 'structuredClone', message: 'Use structuredClone from @tldraw/util instead' },
		],
		'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: true,
	},
	overrides: [
		{
			// enable the rule specifically for TypeScript files
			files: ['*.ts', '*.tsx'],
			rules: {
				'@typescript-eslint/explicit-module-boundary-types': [0],
				'no-console': ['error', { allow: ['warn', 'error'] }],
			},
		},
		{
			files: ['e2e/**/*'],
			rules: {
				'@typescript-eslint/no-empty-function': 'off',
			},
		},
		{
			files: 'scripts/**/*',
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
			files: ['apps/huppy/**/*', 'scripts/**/*'],
			rules: {
				'no-console': 'off',
			},
		},
		{
			files: ['apps/dotcom/**/*'],
			rules: {
				'no-restricted-properties': [
					2,
					{
						object: 'crypto',
						property: 'randomUUID',
						message: 'Please use the makeUUID util instead.',
					},
				],
			},
		},
	],
}
