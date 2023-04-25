/* eslint-disable */

module.exports = {
	extends: ['prettier'],
	settings: {
		next: {
			rootDir: ['apps/*/', 'packages/*/', 'bublic/apps/*/', 'bublic/packages/*/'],
		},
	},
	rules: {
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
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
			},
		],
	},
}
