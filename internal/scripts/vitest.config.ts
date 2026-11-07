/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../config/vitest/node-preset'

// Source lives at the package root, not `src/`, so the preset's include misses it.
export default mergeConfig(baseConfig, {
	test: {
		environment: 'node',
		include: ['**/*.test.ts'],
	},
})
