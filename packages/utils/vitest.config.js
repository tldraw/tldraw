const { resolve } = require('path')

module.exports = {
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['raf/polyfill'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: [
			'node_modules',
			'dist',
			'.tsbuild',
			'.tsbuild-dev',
			'.tsbuild-pub',
		],
		coverage: {
			include: ['src/**/*.{ts,tsx}'],
			exclude: [
				'node_modules',
				'dist',
				'.tsbuild',
				'.tsbuild-dev',
				'.tsbuild-pub',
			],
		},
	},
	resolve: {
		alias: {
			'~': resolve(__dirname, './src'),
		},
	},
}