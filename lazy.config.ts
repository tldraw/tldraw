import { LazyConfig } from 'lazyrepo'

export function generateSharedScripts(bublic: '<rootDir>' | '<rootDir>/bublic') {
	return {
		build: {
			baseCommand: 'exit 0',
			runsAfter: { prebuild: {}, 'refresh-assets': {} },
			workspaceOverrides: {
				'{bublic/,}apps/vscode/*': { runsAfter: { 'refresh-assets': {} } },
				'{bublic/,}packages/*': {
					runsAfter: { 'build-api': { in: 'self-only' }, prebuild: { in: 'self-only' } },
					cache: {
						inputs: ['api/**/*', 'src/**/*'],
					},
				},
			},
		},
		dev: {
			execution: 'independent',
			runsAfter: { 'refresh-assets': {} },
			cache: 'none',
			workspaceOverrides: {
				'{bublic/,}apps/vscode/*': { runsAfter: { build: { in: 'self-only' } } },
			},
		},
		test: {
			baseCommand: 'yarn run -T jest',
			runsAfter: { 'refresh-assets': {} },
			cache: {
				inputs: {
					exclude: ['*.tsbuildinfo'],
				},
			},
		},
		'test-coverage': {
			baseCommand: 'yarn run -T jest --coverage',
			runsAfter: { 'refresh-assets': {} },
		},
		lint: {
			execution: 'independent',
			runsAfter: { 'build-types': {} },
			cache: {
				inputs: {
					exclude: ['*.tsbuildinfo'],
				},
			},
		},
		'pack-tarball': {
			parallel: false,
		},
		'refresh-assets': {
			execution: 'top-level',
			baseCommand: `tsx ${bublic}/scripts/refresh-assets.ts`,
			cache: {
				inputs: ['package.json', `${bublic}/scripts/refresh-assets.ts`, `${bublic}/assets/**/*`],
			},
		},
		'build-types': {
			execution: 'top-level',
			baseCommand: `tsx ${bublic}/scripts/typecheck.ts`,
			cache: {
				inputs: {
					include: ['<allWorkspaceDirs>/**/*.{ts,tsx}', '<allWorkspaceDirs>/tsconfig.json'],
					exclude: ['<allWorkspaceDirs>/dist*/**/*', '<allWorkspaceDirs>/api/**/*'],
				},
				outputs: ['<allWorkspaceDirs>/*.tsbuildinfo', '<allWorkspaceDirs>/.tsbuild/**/*'],
			},
			runsAfter: {
				'refresh-assets': {},
				'maybe-clean-tsbuildinfo': {},
			},
		},
		'build-api': {
			execution: 'independent',
			cache: {
				inputs: ['.tsbuild/**/*.d.ts', 'tsconfig.json'],
				outputs: ['api/**/*'],
			},
			runsAfter: {
				'build-types': {
					// Because build-types is top level, if usesOutput were set to true every
					// build-api task would depend on all the .tsbuild files in the whole
					// repo. So we set this to false and configure it to use only the
					// local .tsbuild files
					usesOutput: false,
				},
			},
		},
		'api-check': {
			execution: 'top-level',
			baseCommand: `tsx ${bublic}/scripts/api-check.ts`,
			runsAfter: { 'build-api': {} },
			cache: {
				inputs: [`${bublic}/packages/*/api/public.d.ts`],
			},
		},
	} satisfies LazyConfig['scripts']
}

const config = {
	baseCacheConfig: {
		include: [
			'<rootDir>/{,bublic/}package.json',
			'<rootDir>/{,bublic/}public-yarn.lock',
			'<rootDir>/{,bublic/}lazy.config.ts',
			'<rootDir>/{,bublic/}config/**/*',
			'<rootDir>/{,bublic/}scripts/**/*',
		],
		exclude: [
			'<allWorkspaceDirs>/coverage/**/*',
			'<allWorkspaceDirs>/dist*/**/*',
			'**/*.tsbuildinfo',
			'<rootDir>/{,bublic/}docs/gen/**/*',
		],
	},
	scripts: {
		...generateSharedScripts('<rootDir>'),
	},
} satisfies LazyConfig

export default config
