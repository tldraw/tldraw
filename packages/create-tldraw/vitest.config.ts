/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// create-tldraw package uses the standard node preset with minimal overrides
export default mergeConfig(baseConfig, {
	test: {
		// Handle ESM modules that need to be transformed
		transformMode: {
			// Transform these ESM modules during testing
			ssr: ['ansi-styles', 'string-width', 'strip-ansi', 'ansi-regex', 'get-east-asian-width'],
		},
	},
})
