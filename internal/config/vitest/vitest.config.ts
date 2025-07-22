import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.tsbuild/**',
			'**/test/__fixtures__/**',
			'**/e2e/**',
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/.tsbuild/**',
				'**/test/**',
				'**/*.d.ts',
			],
		},
		setupFiles: ['../../config/setupVitest.ts'],
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, '../../'),
		},
	},
})