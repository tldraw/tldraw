/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../internal/config/vitest/node-preset'

// AI package uses the standard node preset with no overrides
export default mergeConfig(baseConfig, {})
