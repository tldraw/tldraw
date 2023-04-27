import { LazyConfig } from 'lazyrepo'

export function generateSharedTasks(bublic: '<rootDir>' | '<rootDir>/bublic') {
	return {
		build: {
			runsAfter: { 'build:package': {}, prebuild: {} },
		},
		'build:vscode-editor': {
			runsAfter: { 'refresh-assets': {} },
		},
		dev: {
			execution: 'independent',
			runsAfter: { 'refresh-assets': {} },
			cache: 'none',
		},
		'dev:vscode': {
			runsAfter: { 'build:vscode-editor': {} },
		},
		test: {
			baseCommand: 'yarn run -T jest',
			runsAfter: { 'refresh-assets': {} },
		},
		'test:coverage': {
			baseCommand: 'yarn run -T jest --coverage',
		},
		lint: {
			execution: 'independent',
			runsAfter: { 'build:types': {} },
		},
		'build:package': {
			runsAfter: { 'build:api': {}, prebuild: {} },
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
		'build:types': {
			execution: 'top-level',
			baseCommand: `tsx ${bublic}/scripts/typecheck.ts`,
			cache: {
				inputs: {
					include: [
						'{,bublic/}packages/*/src/**/*.{ts,tsx}',
						'{,bublic/}{apps,scripts,e2e}/**/*.{ts,tsx}',
						'{,bublic/}{apps,packages}/*/tsconfig.json',
						'{,bublic/}{scripts,e2e}/tsconfig.json',
					],
					exclude: ['**/dist*/**/*.d.ts'],
				},
			},
			runsAfter: {
				'refresh-assets': {},
				'maybe-clean-tsbuildinfo': {},
			},
		},
		'build:api': {
			execution: 'independent',
			cache: {
				inputs: ['.tsbuild/**/*.d.ts', 'tsconfig.json'],
			},
			runsAfter: { 'build:types': {} },
		},
		'build:docs': {
			runsAfter: { 'docs:content': {} },
		},
		'dev:docs': {
			runsAfter: { 'docs:content': {} },
		},
		'app:build': {
			runsAfter: { 'build:types': {} },
		},
		'docs:content': {
			runsAfter: { 'build:api': {} },
			cache: {
				inputs: [
					'content/**',
					'scripts/**',
					`${bublic}/packages/*/api/api.json`,
					`${bublic}/packages/*/package.json`,
				],
			},
		},
		'api:check': {
			execution: 'top-level',
			baseCommand: `tsx ${bublic}/scripts/api-check.ts`,
			runsAfter: { 'build:api': {} },
			cache: {
				inputs: [`${bublic}/packages/*/api/public.d.ts`],
			},
		},
	} satisfies LazyConfig['tasks']
}

const config = {
	baseCacheConfig: {
		include: [
			'<rootDir>/package.json',
			'<rootDir>/public-yarn.lock',
			'<rootDir>/lazy.config.ts',
			'<rootDir>/config/**/*',
			'<rootDir>/scripts/**/*',
		],
		exclude: [
			'coverage/**/*',
			'dist*/**/*',
			'**/*.tsbuildinfo',
			'<rootDir>/apps/app/bublic/*.{js,map}',
			'<rootDir>/apps/docs/content/gen/**/*',
		],
	},
	tasks: {
		...generateSharedTasks('<rootDir>'),
	},
} satisfies LazyConfig

export default config
