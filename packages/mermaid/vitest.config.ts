/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

export default mergeConfig(baseConfig, {
	test: {
		setupFiles: ['../../internal/config/vitest/setup.ts', './setupVitest.js'],
	},
})
