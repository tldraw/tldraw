/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// The command backtests run real editors against a room, so they need the same polyfills as
// sync-core's tests.
export default mergeConfig(baseConfig, {
	test: {
		setupFiles: ['../../internal/config/vitest/setup.ts', './setupVitest.js'],
	},
})
