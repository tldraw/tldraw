/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../../internal/config/vitest/node-preset'

export default mergeConfig(baseConfig, {
	test: {
		// node-preset defaults to jsdom; a Worker has no DOM.
		environment: 'node',
	},
})
