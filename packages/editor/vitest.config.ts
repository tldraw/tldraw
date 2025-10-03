/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// editor package needs jsdom environment, CSS mocking, and global fake timers
export default mergeConfig(baseConfig, {
	test: {
		environment: 'jsdom',
		setupFiles: ['../../internal/config/vitest/setup.ts', './setupVitest.js'],
		fakeTimers: {
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
		},
		css: {
			modules: {
				classNameStrategy: 'non-scoped',
			},
		},
	},
	css: {
		modules: {
			// This provides similar functionality to identity-obj-proxy
			// CSS class names will be returned as-is for testing
			generateScopedName: (name) => name,
		},
	},
})
