/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../../internal/config/vitest/node-preset'

// tail-worker is a Node.js/Cloudflare Worker environment
export default mergeConfig(baseConfig, {
	test: {
		environment: 'node',
		passWithNoTests: true,
	},
})
