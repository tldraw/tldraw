/// <reference types="vitest" />
import { mergeConfig } from 'vitest/config'
import baseConfig from '../../../internal/config/vitest/node-preset'

export default mergeConfig(baseConfig, {
	test: {
		environment: 'node',
		alias: {
			'^~(.*)$': './src/$1',
		},
		transformMode: {
			web: [/\.([cm]?[jt]sx?)$/],
			ssr: [/\.([cm]?[jt]sx?)$/],
		},
		// forks + --experimental-sqlite so tests can use node:sqlite
		pool: 'forks',
		poolOptions: {
			forks: {
				execArgv: ['--experimental-sqlite'],
			},
		},
	},
})
