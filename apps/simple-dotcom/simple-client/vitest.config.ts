import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'simple-client',
		globals: true,
		environment: 'node',
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		exclude: ['node_modules', 'e2e', '.next', 'dist'],
		testTimeout: 10000,
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
})
