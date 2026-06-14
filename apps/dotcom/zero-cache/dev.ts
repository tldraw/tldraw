/* eslint-disable no-console */
import { ChildProcess, spawn } from 'child_process'
import dotenv from 'dotenv'
import pg from 'pg'
import { DOTCOM_DEV_PORTS, DOTCOM_DEV_READINESS_TIMEOUT_MS, getDotcomDevEnv } from './dev-env'

const env = getDotcomDevEnv()
const dotEnv = dotenv.config({ path: env.dockerEnvFile }).parsed ?? {}
const childEnv = {
	...dotEnv,
	...process.env,
	// Branch-scoped dev values intentionally win over shell vars for deterministic local state.
	...env.zeroEnv,
}

const children: ChildProcess[] = []
let migrationsReady = false
let shuttingDown = false

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function statusFromExit(code: number | null, signal: NodeJS.Signals | null) {
	return signal ? `signal ${signal}` : `code ${code ?? 1}`
}

function shutdown(code: number) {
	if (shuttingDown) return
	shuttingDown = true

	for (const child of [...children].reverse()) {
		if (!child.killed) {
			child.kill('SIGINT')
		}
	}

	setTimeout(() => process.exit(code), 500).unref()
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

async function waitForPostgres() {
	const connectionString =
		childEnv.ZERO_UPSTREAM_DB ??
		`postgresql://user:password@127.0.0.1:${DOTCOM_DEV_PORTS.postgres}/postgres`
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
	console.log(`Dotcom Zero dev branch key: ${env.branchKey}`)
	console.log(`Docker compose project: ${env.composeProjectName}`)
	console.log(`Postgres volume: ${env.postgresVolumeName}`)
	console.log(`Zero replica: ${env.zeroReplicaFile}`)

	process.on('SIGINT', () => shutdown(0))
	process.on('SIGTERM', () => shutdown(0))

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
	await waitForHttpOk(`http://localhost:${DOTCOM_DEV_PORTS.migrations}`, 'migrations')
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

	await waitForHttpOk(`http://localhost:${DOTCOM_DEV_PORTS.zero}/`, 'Zero')
	console.log(`Zero is ready at http://localhost:${DOTCOM_DEV_PORTS.zero}/`)

	await new Promise(() => {
		// Keep the orchestration process alive while child processes run.
	})
}

main().catch((error) => {
	console.error(error)
	shutdown(1)
})
