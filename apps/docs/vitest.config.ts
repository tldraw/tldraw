/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// docs is a Next.js app that tests markdown parsing - needs jsdom for React components
export default mergeConfig(baseConfig, {
	test: {
		// Use jsdom environment (similar to the original patchedJestJsDom)
		environment: 'jsdom',
		// Include test roots
		include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
		// Allow all modules to be transformed (equivalent to transformIgnorePatterns: [])
		transformMode: {
			web: [/\.([cm]?[jt]sx?)$/],
			ssr: [/\.([cm]?[jt]sx?)$/],
		},
	},
})
