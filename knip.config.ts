import type { KnipConfig } from 'knip'

// Knip catches two classes of bugs in this monorepo:
//   1. Undeclared deps – a workspace's source imports a package its own
//      package.json doesn't list (Yarn hoists it from another workspace, so
//      builds happen to pass until the other workspace stops declaring it).
//   2. Unused deps – package.json declares a package nothing actually imports.
//
// We intentionally do NOT enable knip's unused-files / unused-exports checks
// here. They're noisy and a separate decision. The CI gate runs `yarn knip`,
// which respects the `include` list below.
//
// The `ignoreDependencies` lists below establish a baseline: knip flagged a
// long tail of suspected-unused deps in existing workspaces that we don't
// have the bandwidth to investigate one-by-one in this PR. They're listed
// here per-workspace so each one is visible, with the intent of trimming the
// list over time as workspaces are audited. New unused/undeclared deps will
// still be caught.

const config: KnipConfig = {
	include: ['dependencies', 'devDependencies', 'unlisted'],

	// Repo-wide ignores. These cover packages that are real and used, but
	// knip can't link them back to a source import:
	//   - infra binaries invoked from package.json scripts (lazyrepo,
	//     wrangler, ...) – knip's binary detection doesn't follow
	//     `yarn run -T tsx <root-script>` indirection.
	//   - bundler / TS toolchain plugins consumed indirectly via configs.
	//   - ambient `@types/*` and runtime helpers.
	ignoreDependencies: [
		// Patched packages – knip can't follow `patch:` resolutions back
		// to the source import declared in the workspace package.json.
		'@microsoft/tsdoc',

		// Build / dev infrastructure invoked via root-level scripts or
		// per-workspace npm scripts that delegate through `tsx`.
		'lazyrepo',
		'wrangler',
		'esbuild',
		'vue-tsc',
		'concurrently',
		'mocha',
		'webpack',
		'ts-loader',
		'ovsx',
		'ts-node-dev',
		'create-serve',
		'patch-package',
		'postinstall-postinstall',
		'vercel',
		'@sentry/cli',
		'@microsoft/api-extractor',
		'@swc/core',
		'@typescript/native-preview',
		'@vercel/build-utils',
		'license-report',
		'vite-plugin-circular-dependency',
		'vitest-canvas-mock',
		'sharp',
		'identity-obj-proxy',
		'cross-env',
		'dotenv',
		'tslib',

		// Tools triggered from root scripts (refresh-assets, clean, ...).
		'rimraf',
		'fs-extra',
		'svgo',
		'adm-zip',

		// Ambient `@types/*` packages. These are picked up by the TS
		// compiler via `types` arrays or auto-include, not by source
		// imports knip can trace.
		'@cloudflare/workers-types',
		'@types/adm-zip',
		'@types/aws-lambda',
		'@types/benchmark',
		'@types/classnames',
		'@types/diff',
		'@types/express',
		'@types/fs-extra',
		'@types/glob',
		'@types/google-apps-script',
		'@types/js-cookie',
		'@types/lz-string',
		'@types/md5',
		'@types/node-fetch',
		'@types/react-dom',
		'@types/react-router-dom',
		'@types/sqlite3',
		'@types/wicg-file-system-access',
		'@types/ws',

		// Implicit deps surfaced by Cloudflare worker ambient imports
		// (`cloudflare:workers`, `cloudflare:email`, ...).
		'cloudflare',

		// `@types/mdast` is real; `mdast` is the import name for the
		// virtual types-only package.
		'mdast',
	],

	workspaces: {
		'.': {
			entry: ['lazy.config.ts'],
		},

		// dotcom client has a build-time scripts dir not picked up by the
		// vite plugin's default entry detection.
		'apps/dotcom/client': {
			entry: ['scripts/**/*.{ts,js}', 'sentry-release-name.ts'],
			// `ws` is currently declared as a devDep but no source imports
			// it directly – likely a leftover. Leaving baseline-suppressed
			// to keep this PR focused on adding the check itself.
			ignoreDependencies: ['ws'],
		},

		'apps/docs': {
			entry: ['scripts/**/*.ts'],
			// Baseline: these were declared before the knip check landed.
			// Audit and trim individually in a follow-up.
			ignoreDependencies: [
				'@tldraw/assets',
				'google-auth-library',
				'js-cookie',
				'query-string',
				'rehype-slug',
			],
		},

		'apps/dotcom/zero-cache': {
			entry: ['migrations/**/*.ts'],
			// `tsconfig.json` declares `jsxImportSource: "react"` left over
			// from a copy-paste of the dotcom client config; this app
			// doesn't actually render React.
			ignoreDependencies: ['react'],
		},

		'apps/dotcom/image-resize-worker': {
			// Baseline.
			ignoreDependencies: ['itty-router'],
		},

		'apps/dotcom/sync-worker': {
			// Baseline.
			ignoreDependencies: ['@supabase/auth-helpers-remix', '@tldraw/validate', 'jose'],
		},

		'apps/bemo-worker': {
			// Baseline.
			ignoreDependencies: ['@tldraw/dotcom-shared', '@tldraw/store'],
		},

		// Examples are loaded dynamically via `import.meta.glob` from each
		// README.md and component file. Knip can't trace that, so list the
		// example directories as entries.
		'apps/examples': {
			entry: ['src/examples/**/*.{ts,tsx,md}', 'src/misc/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
			// Baseline.
			ignoreDependencies: ['@tldraw/driver', 'classnames'],
		},

		'apps/vscode/extension': {
			entry: ['src/extension.ts', 'src/**/*.ts', 'scripts/**/*.ts'],
			// Baseline. `node-fetch` is bundled by webpack; the others are
			// devDeps from the VS Code extension scaffolding.
			ignoreDependencies: ['node-fetch', '@tldraw/editor', 'assert', 'process'],
		},

		'internal/apps-script': {
			entry: ['build-workspace-app.ts'],
		},

		'internal/config': {
			// `tsconfig.base.json` declares `jsxImportSource: "react"`, a
			// virtual reference for downstream workspaces' JSX.
			ignoreDependencies: ['react'],
		},

		'internal/scripts': {
			entry: ['*.ts', '*.tsx', 'dotcom/**/*.ts', 'lib/**/*.ts', 'workers/**/*.ts'],
			// Baseline.
			ignoreDependencies: ['gray-matter', 'ignore'],
		},

		// Package defaults catch index + scripts + test files. The vitest
		// preset (internal/config/vitest/node-preset.ts) is loaded via
		// mergeConfig, which knip's vitest plugin doesn't always trace, so
		// list test files explicitly.
		'packages/*': {
			entry: [
				'src/index.{ts,tsx}',
				'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
				'src/test/**/*.{ts,tsx}',
				'scripts/**/*.{ts,mjs,js}',
				'setupTests.{js,ts}',
				'setupVitest.{js,ts}',
			],
		},
		'packages/assets': {
			entry: ['*.{js,mjs,ts}'],
			ignoreDependencies: ['@tldraw/utils'],
		},
		'packages/create-tldraw': {
			entry: ['scripts/**/*', 'src/**/*.ts'],
			ignoreDependencies: ['@tldraw/utils', 'ansi-regex'],
		},
		'packages/dotcom-shared': {
			ignoreDependencies: ['@tldraw/store', '@tldraw/tlschema', '@tldraw/validate'],
		},
		'packages/editor': {
			ignoreDependencies: ['is-plain-object', 'benchmark'],
		},
		'packages/mermaid': {
			ignoreDependencies: ['@tldraw/tlschema'],
		},
		'packages/store': {
			ignoreDependencies: ['raf'],
		},
		'packages/sync': {
			ignoreDependencies: [
				'@tldraw/state-react',
				'nanoevents',
				'ws',
				'uuid-by-string',
				'uuid-readable',
			],
		},
		'packages/tldraw': {
			ignoreDependencies: ['@tiptap/extension-list', 'idb'],
		},
		'packages/tlschema': {
			ignoreDependencies: ['kleur'],
		},

		// Templates are stand-alone starter projects. Most have entries
		// auto-detected by knip's plugins; a few have unused deps in their
		// scaffolding.
		'templates/agent': {
			ignoreDependencies: [
				'@google/generative-ai',
				'@tldraw/tlschema',
				'@worker-tools/json-stream',
				'best-effort-json-parser',
			],
		},
		'templates/branching-chat': {
			ignoreDependencies: ['radix-ui'],
		},
		'templates/simple-server-example': {
			ignoreDependencies: ['itty-router', 'react-router-dom'],
		},
		'templates/socketio-server-example': {
			ignoreDependencies: ['react-router-dom'],
		},
	},
}

export default config
