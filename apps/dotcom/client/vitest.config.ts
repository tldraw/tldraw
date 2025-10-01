import { defineConfig } from 'vitest/config'

export default defineConfig({
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'react',
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./setupTests.js'],
		globals: true,
		testTimeout: 30000,
		include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
		exclude: ['**/e2e/**'],
	},
	resolve: {
		alias: {
			'\\.(css|less)$': 'identity-obj-proxy',
		},
	},
})
