/* eslint-disable no-console */
//
// SPIKE: per-worktree port-block allocation for running multiple parallel dotcom dev stacks.
//
// This is the host-native answer to "run dotcom in N worktrees at once" — the original motivation
// behind the whole Docker / process-compose exploration. It is, essentially, a re-implementation of
// PR #9273 layered on top of the process-compose spike (#9301).
//
// THE POINT OF THIS FILE IS TO SHOW THE COST. process-compose let us delete ~960 lines of hand-rolled
// supervision (dev.ts et al). Supporting parallel worktrees drags a chunk of bespoke config logic
// right back: every host-global resource (ports, the wrangler dev registry, the zero replica, the
// postgres docker project) has to be offset per worktree, and every inter-service URL rewired to
// match. Container network isolation (the Docker spike) makes almost all of this disappear.
//
// `yarn dev-app` runs this; it gives the current worktree a stable block index, assigns it a
// contiguous band of ports (one slot per service), derives ~25 env values, and execs process-compose
// with them. Parallel-by-default: the client stays on :3000 for worktree 0, the rest are packed
// consecutively, and every worktree's band is disjoint — so N stacks never collide.

import { spawn } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Parallel-by-default: every worktree gets a contiguous 20-port band and each service a fixed slot
// in it. Band for worktree N is [3000 + N*20 .. +19]; the client keeps :3000 for worktree 0 (the one
// port people actually type), everything else is packed consecutively after it. Collision-free by
// construction — no reliance on lucky port spacing, and adding a service is just the next slot.
// NOTE: zero-cache binds its port AND port+1/+2 (change-streamer, litestream), so slots 6 & 7 are
// left empty after ZERO_PORT (slot 5). That per-service span is the one thing consecutive can't ignore.
const BLOCK_BASE = 3000
const BLOCK_SIZE = 20
const PORT_SLOTS = {
	CLIENT_PORT: 0,
	SYNC_PORT: 1,
	ASSET_PORT: 2,
	IMAGE_PORT: 3,
	USERCONTENT_PORT: 4,
	ZERO_PORT: 5, // also uses slots 6 & 7 (zero's change-streamer + litestream)
	PG_PORT: 8,
	PGBOUNCER_PORT: 9,
	PC_PORT: 10, // process-compose's own API/TUI port
	SYNC_INSPECTOR: 11,
	ASSET_INSPECTOR: 12,
	IMAGE_INSPECTOR: 13,
	USERCONTENT_INSPECTOR: 14,
} as const

// A registry mapping worktree path -> block index, so each worktree keeps a stable block across runs.
// (Yes — needing a persistent port-allocation registry is itself part of the cost.)
const REGISTRY_FILE = join(homedir(), '.tldraw-dotcom-dev-ports.json')

function allocateBlockIndex(worktree: string): number {
	const registry: Record<string, number> = existsSync(REGISTRY_FILE)
		? JSON.parse(readFileSync(REGISTRY_FILE, 'utf8'))
		: {}
	if (worktree in registry) return registry[worktree]

	const used = new Set(Object.values(registry))
	let idx = 0
	while (used.has(idx)) idx++
	registry[worktree] = idx
	writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2))
	return idx
}

function buildEnv(idx: number, worktree: string) {
	const base = BLOCK_BASE + idx * BLOCK_SIZE
	const p = Object.fromEntries(
		Object.entries(PORT_SLOTS).map(([k, slot]) => [k, String(base + slot)])
	) as Record<keyof typeof PORT_SLOTS, string>

	const pgConn = `postgresql://user:password@127.0.0.1:${p.PG_PORT}/postgres`

	return {
		...p,
		// host-global resources that must be per-worktree
		WRANGLER_REGISTRY_PATH: join(worktree, '.wrangler', 'registry'),
		ZERO_REPLICA_FILE: `/tmp/tldraw-dotcom-zero-${idx}.db`,
		COMPOSE_PROJECT_NAME: `tldraw_dotcom_pg_${idx}`,
		// every inter-service URL, rewired to the block's ports
		MULTIPLAYER_SERVER: `http://localhost:${p.SYNC_PORT}`, // client bundle + vite /api proxy target
		ZERO_SERVER: `http://localhost:${p.ZERO_PORT}/`,
		USER_CONTENT_URL: `http://localhost:${p.USERCONTENT_PORT}`,
		ASSET_UPLOAD_ORIGIN: `http://localhost:${p.ASSET_PORT}`,
		CLIENT_ORIGIN: `http://localhost:${p.CLIENT_PORT}`, // sync-worker's MULTIPLAYER_SERVER var points here
		BOTCOM_POSTGRES_CONNECTION_STRING: pgConn,
		BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: `postgresql://user:password@127.0.0.1:${p.PGBOUNCER_PORT}/postgres`,
		ZERO_UPSTREAM_DB: pgConn,
		ZERO_CVR_DB: pgConn,
		ZERO_CHANGE_DB: pgConn,
		ZERO_MUTATE_URL: `http://localhost:${p.SYNC_PORT}/app/zero/mutate`,
		ZERO_QUERY_URL: `http://localhost:${p.SYNC_PORT}/app/zero/query`,
	}
}

function summarize(idx: number, env: Record<string, string>) {
	console.log(`\ndotcom dev stack — worktree block #${idx} (offset ${idx * 100})`)
	console.log(`  client        http://localhost:${env.CLIENT_PORT}`)
	console.log(
		`  sync-worker   :${env.SYNC_PORT}   zero :${env.ZERO_PORT}   postgres :${env.PG_PORT}`
	)
	console.log(
		`  workers       asset :${env.ASSET_PORT}  image :${env.IMAGE_PORT}  usercontent :${env.USERCONTENT_PORT}`
	)
	console.log(
		`  process-compose API :${env.PC_PORT}   wrangler registry ${env.WRANGLER_REGISTRY_PATH}\n`
	)
}

function main() {
	const worktree = repoRoot
	const idx = allocateBlockIndex(worktree)
	const env = buildEnv(idx, worktree)
	summarize(idx, env)

	// `--print` just dumps the computed env (used for tests / the README) without booting anything.
	if (process.argv.includes('--print')) {
		for (const [k, v] of Object.entries(env)) console.log(`${k}=${v}`)
		return
	}

	mkdirSync(env.WRANGLER_REGISTRY_PATH, { recursive: true })

	const child = spawn(
		'process-compose',
		['-f', 'apps/dotcom/process-compose.yaml', 'up', '--port', env.PC_PORT],
		{ cwd: repoRoot, env: { ...process.env, ...env }, stdio: 'inherit' }
	)
	const stop = (sig: NodeJS.Signals) => child.kill(sig)
	process.on('SIGINT', () => stop('SIGINT'))
	process.on('SIGTERM', () => stop('SIGTERM'))
	child.once('exit', (code) => process.exit(code ?? 0))
}

main()
