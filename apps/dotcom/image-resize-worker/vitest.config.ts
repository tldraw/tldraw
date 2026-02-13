/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../../internal/config/vitest/node-preset'

// image-resize-worker is a Node.js/Cloudflare Worker environment
export default mergeConfig(baseConfig, {
	test: {
		// Use node environment instead of jsdom for worker apps
		environment: 'node',
		// Module name mapping for path aliases
		alias: {
			'^~(.*)$': './src/$1',
		},
		// Pass with no tests (equivalent to --passWithNoTests)
		passWithNoTests: true,
	},
})
