/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// bemo-worker is a Node.js/Cloudflare Worker environment
export default mergeConfig(baseConfig, {
	test: {
		// Use node environment instead of jsdom for worker apps
		environment: 'node',
		// Module name mapping for path aliases
		alias: {
			'^~(.*)$': './src/$1',
		},
	},
})
