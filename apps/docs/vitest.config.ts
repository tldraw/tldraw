/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'jsdom',
		include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
		globals: true,
		exclude: [
			'**/test/__fixtures__/**',
			'**/node_modules/**',
			'**/dist/**',
			'**/.tsbuild/**',
			'**/.tsbuild-dev/**',
			'**/.tsbuild-pub/**',
		],
	},
})
