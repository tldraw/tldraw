const svgTransformPath = require.resolve('config/svgTransform.js')
const importMetaMock = require.resolve('config/importMetaMock.js')

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
	moduleNameMapper: {
		importMeta: importMetaMock,
	},
	transformIgnorePatterns: ['node_modules/(?!(nanoid)/)'],
	collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}'],
}
