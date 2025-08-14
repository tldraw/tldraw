/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

// docs is a Next.js app that tests markdown parsing - needs jsdom for React components
export default defineConfig({
	test: {
		// Use jsdom environment (similar to the original patchedJestJsDom)
		environment: 'jsdom',
		globals: true,
		// Include test roots
		include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
		// Allow all modules to be transformed (equivalent to transformIgnorePatterns: [])
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
