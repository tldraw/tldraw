/* eslint-disable no-console */
//
// Port allocation for running multiple parallel dotcom dev stacks (one per git worktree).
//
// This is the host-native answer to "run dotcom in N worktrees at once" — the original motivation
// behind the process-compose work. It re-implements per-worktree isolation on top of the host-native
// stack: process-compose let us delete the hand-rolled supervisor, but supporting parallel worktrees
// drags a chunk of config back, because every host-global resource (ports, the wrangler dev registry,
// the zero replica, the postgres docker project) has to be offset and every inter-service URL rewired
// to match. (Container network isolation would make most of this disappear — see #9296.)
//
// `yarn dev-app` runs this: it finds the lowest stack index whose ports are ALL free, derives ~25 env
// values from it, writes them to .dev-ports.json (for tools that can't inherit this env, like the e2e
// harness), and execs process-compose. Each service's port is its normal default plus the index, so
// index 0 is an ordinary single-stack dev — unchanged. The index steps past any port already in use,
// whether a system listener (e.g. macOS launchd) or another running stack, so stacks never collide.

import { spawn, spawnSync } from 'child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { createServer } from 'net'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const composeFile = 'apps/dotcom/zero-cache/docker/docker-compose.yml'
const devPortsFile = join(repoRoot, '.dev-ports.json')

// Each service's natural dev port. Index 0 == a normal single-stack dev (unchanged); stack index N
// adds N to every port. zero-cache also binds ZERO_PORT+1/+2 (change-streamer + litestream), so those
// are probed too. The keys are the ${VARS} that process-compose.yaml / docker-compose.yml expand.
const DEFAULT_PORTS = {
	CLIENT_PORT: 3000,
	SYNC_PORT: 8787,
	ASSET_PORT: 8788,
	IMAGE_PORT: 8786,
	USERCONTENT_PORT: 8789,
	ZERO_PORT: 4848,
	PG_PORT: 6543,
	PGBOUNCER_PORT: 6432,
	PC_PORT: 8080, // process-compose's own API/TUI port
	SYNC_INSPECTOR: 9229,
	ASSET_INSPECTOR: 9449,
	IMAGE_INSPECTOR: 9339,
	USERCONTENT_INSPECTOR: 9450,
} as const

const MAX_STACK_INDEX = 50

function portsForIndex(idx: number): number[] {
	const ports = Object.values(DEFAULT_PORTS).map((port) => port + idx)
	ports.push(DEFAULT_PORTS.ZERO_PORT + idx + 1, DEFAULT_PORTS.ZERO_PORT + idx + 2)
	return ports
}

// Free/taken by trying to listen — the same approach as probePortFree in internal/scripts/workers/dev.ts.
function isPortFree(port: number): Promise<boolean> {
	return new Promise((res) => {
		const server = createServer()
		server.unref()
		server.once('error', () => res(false))
		server.once('listening', () => server.close(() => res(true)))
		server.listen(port, '0.0.0.0')
	})
}

// Lowest stack index whose whole port set is free. Index 0 is the natural single-stack ports; each
// higher index shifts every service up by one. Indexes with any taken port — held by a system listener
// or another running stack — are skipped, so parallel worktrees never bind the same port.
async function allocateStackIndex(): Promise<number> {
	for (let idx = 0; idx <= MAX_STACK_INDEX; idx++) {
		const free = await Promise.all(portsForIndex(idx).map(isPortFree))
		if (free.every(Boolean)) return idx
	}
	throw new Error(`no free port band found within ${MAX_STACK_INDEX} of the default ports`)
}

function buildEnv(idx: number) {
	const p = Object.fromEntries(
		Object.entries(DEFAULT_PORTS).map(([k, port]) => [k, String(port + idx)])
	) as Record<keyof typeof DEFAULT_PORTS, string>

	const pgConn = `postgresql://user:password@127.0.0.1:${p.PG_PORT}/postgres`

	return {
		...p,
		// host-global resources that must be per-stack
		WRANGLER_REGISTRY_PATH: join(repoRoot, '.wrangler', 'registry'),
		ZERO_REPLICA_FILE: `/tmp/tldraw-dotcom-zero-${idx}.db`,
		COMPOSE_PROJECT_NAME: `tldraw_dotcom_dev_${idx}`,
		// every inter-service URL, rewired to the stack's ports
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
	console.log(`\ndotcom dev stack — index ${idx}${idx === 0 ? ' (default ports)' : ''}`)
	console.log(`  client        http://localhost:${env.CLIENT_PORT}`)
	console.log(
		`  sync-worker   :${env.SYNC_PORT}   zero :${env.ZERO_PORT}   postgres :${env.PG_PORT}`
	)
	console.log(
		`  workers       asset :${env.ASSET_PORT}  image :${env.IMAGE_PORT}  usercontent :${env.USERCONTENT_PORT}`
	)
	console.log(
		`  process-compose API :${env.PC_PORT}   compose project ${env.COMPOSE_PROJECT_NAME}\n`
	)
}

// The env published by the most recent `up`. --doctor / --clean act on that running stack rather than
// probing for a fresh index (which would point at a different one).
function readPublishedEnv(): Record<string, string> {
	try {
		return JSON.parse(readFileSync(devPortsFile, 'utf8'))
	} catch {
		return {}
	}
}

async function main() {
	// `--doctor` lists process state for the running stack (its own process-compose API port).
	if (process.argv.includes('--doctor')) {
		const env = readPublishedEnv()
		const r = spawnSync(
			'process-compose',
			[
				'-f',
				'apps/dotcom/process-compose.yaml',
				'process',
				'list',
				'--port',
				env.PC_PORT ?? String(DEFAULT_PORTS.PC_PORT),
			],
			{ cwd: repoRoot, env: { ...process.env, ...env }, stdio: 'inherit' }
		)
		process.exit(r.status ?? 0)
	}

	// `--clean` tears down the running stack's postgres project + volumes + zero replica + state.
	if (process.argv.includes('--clean')) {
		const env = readPublishedEnv()
		const project = env.COMPOSE_PROJECT_NAME ?? 'tldraw_dotcom_dev_0'
		spawnSync('docker', ['compose', '-p', project, '-f', composeFile, 'down', '--volumes'], {
			cwd: repoRoot,
			env: { ...process.env, ...env },
			stdio: 'inherit',
		})
		const replica = env.ZERO_REPLICA_FILE ?? '/tmp/tldraw-dotcom-zero-0.db'
		for (const f of [replica, `${replica}-shm`, `${replica}-wal`, devPortsFile]) {
			rmSync(f, { force: true })
		}
		rmSync(join(repoRoot, 'apps/dotcom/sync-worker/.wrangler/state-dev'), {
			recursive: true,
			force: true,
		})
		return
	}

	// up / --print: probe for the lowest free stack index.
	const idx = await allocateStackIndex()
	const env = buildEnv(idx)
	const childEnv = { ...process.env, ...env }

	summarize(idx, env)

	// `--print` dumps the computed env (for tests / docs) without booting anything.
	if (process.argv.includes('--print')) {
		for (const [k, v] of Object.entries(env)) console.log(`${k}=${v}`)
		return
	}

	mkdirSync(env.WRANGLER_REGISTRY_PATH, { recursive: true })
	writeFileSync(devPortsFile, JSON.stringify(env, null, 2))

	const child = spawn(
		'process-compose',
		['-f', 'apps/dotcom/process-compose.yaml', 'up', '--port', env.PC_PORT],
		{ cwd: repoRoot, env: childEnv, stdio: 'inherit' }
	)
	const stop = (sig: NodeJS.Signals) => child.kill(sig)
	process.on('SIGINT', () => stop('SIGINT'))
	process.on('SIGTERM', () => stop('SIGTERM'))
	child.once('exit', (code) => process.exit(code ?? 0))
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
