/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// tldraw package needs jsdom environment, CSS mocking, and global fake timers
export default mergeConfig(baseConfig, {
	test: {
		// Use jsdom environment like the original Jest setup
		environment: 'jsdom',
		// Configure jsdom URL to match what deep link tests expect
		environmentOptions: {
			jsdom: {
				url: 'http://localhost/test',
			},
		},
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
		// Test path ignore patterns
		exclude: [
			'**/*.css',
			'**/node_modules/**',
			'**/dist/**',
			'**/.tsbuild/**',
			'**/.tsbuild-dev/**',
			'**/.tsbuild-pub/**',
		],
		// Module name mapping for CSS and path aliases
		alias: {
			'^~(.*)$': './src/$1',
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
