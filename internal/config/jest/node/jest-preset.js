const svgTransformPath = require.resolve('../../svgTransform.js')

module.exports = {
	roots: ['<rootDir>/src'],
	transform: {
		'^.+\\.(tsx|jsx|ts|js|mjs)?$': [
			'@swc/jest',
			{
				jsc: {
					parser: {
						syntax: 'typescript',
						dynamicImport: true,
						decorators: true,
					},
					transform: {
						legacyDecorator: true,
						decoratorMetadata: true,
						react: {
							runtime: 'automatic',
						},
					},
				},
			},
		],
		'^.+\\.svg$': svgTransformPath,
	},
	testRegex: '.+\\.(test|spec)\\.(jsx?|tsx?)$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	modulePathIgnorePatterns: [
		'<rootDir>/test/__fixtures__',
		'<rootDir>/node_modules',
		'<rootDir>/dist',
		'<rootDir>/.tsbuild',
		'<rootDir>/.tsbuild-dev',
		'<rootDir>/.tsbuild-pub',
	],
	collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}'],
}
