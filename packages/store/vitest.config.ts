/// <reference types="vitest" />
import path from 'path'
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// Store package has additional crypto setup for testing
export default mergeConfig(baseConfig, {
	test: {
		setupFiles: [
			path.resolve(__dirname, './setupTests.js'),
			...((baseConfig as any).test?.setupFiles || []),
		],
	},
})
