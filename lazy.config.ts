import { LazyConfig } from 'lazyrepo'

export function generateSharedScripts(bublic: '<rootDir>' | '<rootDir>/bublic') {
	return {
		build: {
			runsAfter: { 'build-package': {}, prebuild: {} },
		},
		'build:vscode-editor': {
			runsAfter: { 'refresh-assets': {} },
		},
		dev: {
			execution: 'independent',
			runsAfter: { 'refresh-assets': {} },
			cache: 'none',
		},
		'dev-vscode': {
			runsAfter: { 'build:vscode-editor': {} },
		},
		test: {
			baseCommand: 'yarn run -T jest',
			runsAfter: { 'refresh-assets': {} },
		},
		'test-coverage': {
			baseCommand: 'yarn run -T jest --coverage',
		},
		lint: {
			execution: 'independent',
			runsAfter: { 'build-types': {} },
		},
		'build-package': {
			runsAfter: { 'build-api': {}, prebuild: {} },
			cache: {
				inputs: ['api/**/*', 'src/**/*'],
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
		'build-docs': {
			runsAfter: { 'docs-content': {} },
		},
		'dev-docs': {
			runsAfter: { 'docs-content': {} },
		},
		'docs-content': {
			runsAfter: { 'build-api': {} },
			cache: {
				inputs: [
					'content/**',
					'scripts/**',
					`${bublic}/packages/*/api/api.json`,
					`${bublic}/packages/*/package.json`,
				],
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
			'<rootDir>/{,bublic/}apps/docs/content/gen/**/*',
		],
	},
	scripts: {
		...generateSharedScripts('<rootDir>'),
	},
} satisfies LazyConfig

export default config
