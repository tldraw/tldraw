/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// sync-core package needs custom WebSocket resolution and enhanced jsdom setup
export default mergeConfig(baseConfig, {
	test: {
		// Use jsdom like the original Jest setup
		environment: 'jsdom',
		// Setup files to replace setupJest.js functionality
		setupFiles: ['../../internal/config/vitest/setup.ts', './setupVitest.js'],
		// Allow importing actual modules for partial mocking
		// This helps with jest.requireActual → vi.importActual usage
		globals: true,
	},
})
