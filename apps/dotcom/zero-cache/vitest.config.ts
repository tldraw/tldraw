/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../../internal/config/vitest/node-preset'

// Node env; source lives at the package root, not `src/`, so widen the include.
export default mergeConfig(baseConfig, {
	test: {
		environment: 'node',
		include: ['**/*.test.ts'],
		exclude: ['**/node_modules/**', 'docker/**', '_archive/**'],
	},
})
