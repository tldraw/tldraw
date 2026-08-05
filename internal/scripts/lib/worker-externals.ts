/**
 * Node builtins (and cloudflare modules) that must stay external when bundling a worker
 * entrypoint with esbuild. With nodejs_compat these resolve at runtime in workerd; esbuild just
 * needs to be told not to bundle them. Shared between the dev size reporter
 * (workers/dev.ts) and the CI bundle-size check (check-worker-bundle.ts) so the lists can't drift.
 */
export const WORKER_EXTERNAL_DEPS = [
	'cloudflare:*',
	'crypto',
	'tls',
	'net',
	'stream',
	'fs',
	'os',
	'perf_hooks',
	'path',
	'dns',
	'util',
	'util/types',
	'node:child_process',
	'node:events',
	'node:path',
	'node:process',
	'node:os',
	'node:timers',
	'node:util',
]
