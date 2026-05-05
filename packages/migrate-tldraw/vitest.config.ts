/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

export default mergeConfig(baseConfig, {
	test: {
		// fixtures contain TS/CSS source files that should not be picked up as tests
		exclude: [
			'**/test/__fixtures__/**',
			'**/__fixtures__/**',
			'**/node_modules/**',
			'**/dist/**',
			'**/dist-cjs/**',
			'**/.tsbuild/**',
		],
	},
})
