/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../../internal/config/vitest/node-preset'

// sync-worker is a Node.js/Cloudflare Worker environment
export default mergeConfig(baseConfig, {
	test: {
		// Use node environment instead of jsdom for worker apps
		environment: 'node',
		// Module name mapping for path aliases
		alias: {
			'^~(.*)$': './src/$1',
		},
		// Allow all modules to be transformed (equivalent to transformIgnorePatterns: [])
		transformMode: {
			web: [/\.([cm]?[jt]sx?)$/],
			ssr: [/\.([cm]?[jt]sx?)$/],
		},
		// Pool configuration for experimental Node.js features
		pool: 'forks',
		// Add Node.js flags for experimental SQLite support
		poolOptions: {
			forks: {
				execArgv: ['--experimental-sqlite'],
			},
		},
	},
})
