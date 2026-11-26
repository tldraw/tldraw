/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// core tests run in jsdom with global fake timers. Headless tests opt into the node environment.
export default mergeConfig(baseConfig, {
	test: {
		environment: 'jsdom',
		setupFiles: ['../../internal/config/vitest/setup.ts', './setupVitest.js'],
		fakeTimers: {
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
		},
	},
})
