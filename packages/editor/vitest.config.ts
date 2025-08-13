/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// editor package needs jsdom environment, CSS mocking, and global fake timers
export default mergeConfig(baseConfig, {
	test: {
		// Use jsdom environment like the original Jest setup
		environment: 'jsdom',
		// Setup files to replace setupFiles functionality
		setupFiles: ['../../internal/config/vitest/setup.ts', 'vitest-canvas-mock', './setupVitest.js'],
		// Global fake timers like Jest configuration
		fakeTimers: {
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
		},
		// Allow importing actual modules for partial mocking
		globals: true,
		// CSS module mocking (equivalent to identity-obj-proxy)
		css: {
			modules: {
				classNameStrategy: 'non-scoped',
			},
		},
	},
	// CSS and asset handling
	css: {
		modules: {
			// This provides similar functionality to identity-obj-proxy
			// CSS class names will be returned as-is for testing
			generateScopedName: (name) => name,
		},
	},
})
