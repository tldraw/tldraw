/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.tsbuild/**',
			'**/.tsbuild-dev/**',
			'**/.tsbuild-pub/**',
		],
	},
	resolve: {
		alias: {
			'~': '/src',
		},
	},
})
