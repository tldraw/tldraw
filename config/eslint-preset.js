/* eslint-disable */

module.exports = {
	extends: ['prettier'],
	settings: {
		next: {
			rootDir: ['apps/*/', 'packages/*/', 'bublic/apps/*/', 'bublic/packages/*/'],
		},
	},
	ignorePatterns: ['**/*.js'],
	rules: {
		'no-non-null-assertion': 'off',
		'no-fallthrough': 'off',
		'@typescript-eslint/no-fallthrough': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				destructuredArrayIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
			},
		],
	},
}
