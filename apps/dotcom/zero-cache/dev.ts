/* eslint-disable no-console */
import { ChildProcess, spawn, spawnSync } from 'child_process'
import dotenv from 'dotenv'
import pg from 'pg'
import { DOTCOM_DEV_READINESS_TIMEOUT_MS, getDotcomDevEnv } from './dev-env'

const env = getDotcomDevEnv()
const dotEnv = dotenv.config({ path: env.dockerEnvFile }).parsed ?? {}
const childEnv = {
	...dotEnv,
	...process.env,
	// Per-instance dev values intentionally win over shell vars for deterministic local state.
	...env.zeroEnv,
	...env.dockerEnv,
}

const children: ChildProcess[] = []
let migrationsReady = false
let shuttingDown = false

// Host ports this instance's Docker stack publishes (see docker/docker-compose.yml). Our own stack
// is reused in place across runs, but a stack from an older per-branch setup will hold these ports
// and block `docker compose up`, so we reconcile those away on startup. Sibling instances publish
// different ports, so they are never disturbed.
const DOCKER_PUBLISHED_PORTS = [env.ports.pgbouncer, env.ports.postgres]

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function statusFromExit(code: number | null, signal: NodeJS.Signals | null) {
	return signal ? `signal ${signal}` : `code ${code ?? 1}`
}

/** Collect every descendant PID of `pid` by walking the process tree with `pgrep -P`. */
function descendantPids(pid: number): number[] {
	const result = spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' })
	const childPids = (result.stdout ?? '')
		.split('\n')
		.map((line) => Number(line.trim()))
		.filter((n) => Number.isInteger(n) && n > 0)
	return childPids.flatMap((childPid) => [childPid, ...descendantPids(childPid)])
}

function killChildren() {
	// Reap the whole descendant tree, not just our direct children. The zero-cache dev server spawns
	// worker subprocesses (change-streamer, replicator, syncer, ...) in their own process groups, so a
	// terminal/group signal misses them and they orphan, holding port 4848. Walking by PID crosses
	// those group boundaries. Collect PIDs before killing so the tree does not reparent out from under
	// us, then SIGKILL deepest-first.
	const descendants = descendantPids(process.pid).reverse()
	for (const pid of descendants) {
		try {
			process.kill(pid, 'SIGKILL')
		} catch {
			// already gone
		}
	}
	for (const child of [...children].reverse()) {
		if (!child.killed) {
			child.kill('SIGKILL')
		}
	}
}

function composeDown() {
	// Bring the branch-scoped Docker stack down so its containers and ports (postgres, pgbouncer)
	// are released when the orchestrator stops. SIGINT to the attached `compose up` alone can leave
	// containers running if we were not stopped cleanly.
	//
	// We `dev-app` under lazyrepo, where Ctrl+C delivers SIGINT to the whole process group at once,
	// so a blocking teardown here would race the group being torn down and never finish. Spawn the
	// teardown detached (its own session, immune to that group signal) and unref it so it runs to
	// completion after we exit. The postgres volume is kept (no --volumes) so local data survives a
	// restart; `yarn dev-app:clean` removes it.
	const child = spawn(
		'docker',
		[
			'compose',
			'--env-file',
			env.dockerEnvFile,
			'-f',
			env.dockerComposeFile,
			'--project-name',
			env.composeProjectName,
			'down',
			'--remove-orphans',
		],
		{ cwd: env.zeroCacheDir, detached: true, stdio: 'ignore' }
	)
	child.unref()
}

function shutdown(code: number) {
	if (shuttingDown) return
	shuttingDown = true

	killChildren()
	composeDown()
	process.exit(code)
}

function spawnManaged(
	name: string,
	command: string,
	args: string[],
	{ requiredAfterMigrations = true } = {}
) {
	console.log(`Starting ${name}...`)
	const child = spawn(command, args, {
		cwd: env.zeroCacheDir,
		env: childEnv,
		stdio: 'inherit',
	})
	children.push(child)

	child.once('error', (error) => {
		if (shuttingDown) return
		console.error(`${name} failed to start:`, error)
		shutdown(1)
	})

	child.once('exit', (code, signal) => {
		if (shuttingDown) return
		const status = statusFromExit(code, signal)
		if (name === 'Zero' && migrationsReady) {
			console.error(`Zero exited after migrations completed (${status}).`)
		} else if (!migrationsReady || requiredAfterMigrations) {
			console.error(`${name} exited unexpectedly (${status}).`)
		}
		shutdown(code ?? 1)
	})

	return child
}

async function runOnce(name: string, command: string, args: string[]) {
	console.log(`Running ${name}...`)
	const child = spawn(command, args, {
		cwd: env.zeroCacheDir,
		env: childEnv,
		stdio: 'inherit',
	})

	await new Promise<void>((resolve, reject) => {
		child.once('error', reject)
		child.once('exit', (code, signal) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`${name} failed with ${statusFromExit(code, signal)}`))
			}
		})
	})
}

/**
 * `docker compose up` binds fixed host ports (postgres, pgbouncer). Our own stack
 * (`tldraw_dotcom_dev`) is fine — compose just reattaches to it — but a stack from the old
 * per-branch setup (`tldraw_dotcom_<branch>`) or another Compose project will hold those ports and
 * make `up` fail with "port is already allocated". Previously that surfaced only as the client
 * polling "Waiting for migrations..." for minutes while the orchestrator had already exited.
 *
 * So before bringing our stack up we self-heal: any *other* dotcom dev stack holding our ports is
 * stopped automatically (containers only — its volume is kept). A non-dotcom process holding a port
 * is something we can't safely stop, so we fail fast with an actionable message instead.
 */
function reconcileDockerStacks() {
	const result = spawnSync(
		'docker',
		['ps', '--format', '{{.Names}}\t{{.Label "com.docker.compose.project"}}\t{{.Ports}}'],
		{ encoding: 'utf8' }
	)
	// Docker not running/available yet: let `docker compose up` surface its own error.
	if (result.status !== 0) return

	const dotcomProjects = new Set<string>()
	const foreignHolders: { name: string; ports: number[] }[] = []
	for (const line of (result.stdout ?? '').split('\n')) {
		const [name, project, ports] = line.split('\t')
		if (!name || !ports) continue
		// Our own stack is fine: `docker compose up` just reattaches to the existing containers.
		if (project === env.composeProjectName) continue
		const held = DOCKER_PUBLISHED_PORTS.filter((port) => ports.includes(`:${port}->`))
		if (held.length === 0) continue
		if (project?.startsWith('tldraw_dotcom_')) {
			dotcomProjects.add(project)
		} else {
			foreignHolders.push({ name, ports: held })
		}
	}

	for (const project of dotcomProjects) {
		console.log(`Stopping old dev stack "${project}" (it is holding required ports)...`)
		spawnSync('docker', ['compose', '--project-name', project, 'down', '--remove-orphans'], {
			cwd: env.zeroCacheDir,
			stdio: 'inherit',
		})
	}

	if (foreignHolders.length > 0) {
		console.error('\nCannot start the dotcom dev stack: required host ports are in use.')
		for (const { name, ports } of foreignHolders) {
			console.error(`  • ${name} is holding port(s) ${ports.join(', ')}`)
		}
		console.error('\nStop whatever owns those ports and try again.\n')
		process.exit(1)
	}
}

async function waitForPostgres() {
	const connectionString =
		childEnv.ZERO_UPSTREAM_DB ??
		`postgresql://user:password@127.0.0.1:${env.ports.postgres}/postgres`
	const pool = new pg.Pool({ connectionString, max: 1 })
	const deadline = Date.now() + DOTCOM_DEV_READINESS_TIMEOUT_MS
	let attempts = 0

	try {
		while (Date.now() < deadline) {
			try {
				await pool.query('SELECT 1')
				console.log('Postgres is ready.')
				return
			} catch {
				attempts++
				if (attempts === 1 || attempts % 5 === 0) {
					console.log('Waiting for Postgres...')
				}
				await delay(1000)
			}
		}
		throw new Error('Timed out waiting for Postgres.')
	} finally {
		await pool.end()
	}
}

async function waitForHttpOk(url: string, label: string) {
	const deadline = Date.now() + DOTCOM_DEV_READINESS_TIMEOUT_MS
	let attempts = 0

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url)
			if (response.ok) {
				console.log(`${label} is ready.`)
				return
			}
		} catch {
			// Keep waiting.
		}
		attempts++
		if (attempts === 1 || attempts % 5 === 0) {
			console.log(`Waiting for ${label}...`)
		}
		await delay(1000)
	}

	throw new Error(`Timed out waiting for ${label} at ${url}.`)
}

async function main() {
	console.log(`Dotcom dev instance: ${env.instance} (ports ${env.portBlockStart}+)`)
	console.log(`Docker compose project: ${env.composeProjectName}`)
	console.log(`Postgres volume: ${env.postgresVolumeName}`)
	console.log(`Zero replica: ${env.zeroReplicaFile}`)

	process.on('SIGINT', () => shutdown(0))
	process.on('SIGTERM', () => shutdown(0))
	process.on('SIGHUP', () => shutdown(0))
	// Last-resort sync cleanup if we ever exit through a path that bypassed shutdown(). Keep this light
	// (no subprocess spawning, which is unreliable from an 'exit' handler): just kill our direct children.
	process.on('exit', () => {
		for (const child of children) {
			if (!child.killed) child.kill('SIGKILL')
		}
	})

	reconcileDockerStacks()

	spawnManaged(
		'Docker compose',
		'docker',
		[
			'compose',
			'--env-file',
			env.dockerEnvFile,
			'-f',
			env.dockerComposeFile,
			'--project-name',
			env.composeProjectName,
			'up',
		],
		{ requiredAfterMigrations: true }
	)

	await waitForPostgres()
	await runOnce('schema bundle', 'yarn', ['bundle-schema'])

	spawnManaged('migrations', 'yarn', ['migrate', '--signal-success'])
	await waitForHttpOk(`http://localhost:${env.ports.migrations}`, 'migrations')
	migrationsReady = true

	spawnManaged('schema watch', 'yarn', ['bundle-schema:watch'])
	spawnManaged('Zero', 'yarn', [
		'exec',
		'nodemon',
		'--watch',
		'./.schema.js',
		'--exec',
		'zero-cache-dev',
		'--signal',
		'SIGINT',
	])

	await waitForHttpOk(`http://localhost:${env.ports.zero}/`, 'Zero')
	console.log(`Zero is ready at http://localhost:${env.ports.zero}/`)

	await new Promise(() => {
		// Keep the orchestration process alive while child processes run.
	})
}

main().catch((error) => {
	console.error(error)
	shutdown(1)
})
