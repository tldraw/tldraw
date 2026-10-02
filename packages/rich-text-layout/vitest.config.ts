/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// The core is DOM-free, so tests run in plain node: anything that reaches for `document` or
// `OffscreenCanvas` is a bug, not something the environment should paper over.
export default mergeConfig(baseConfig, {
	test: {
		environment: 'node',
		setupFiles: [],
	},
})
