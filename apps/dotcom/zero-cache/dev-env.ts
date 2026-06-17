import { spawnSync } from 'child_process'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const thisDir = dirname(fileURLToPath(import.meta.url))

export const DOTCOM_DEV_PORTS = {
	client: 3000,
	postgres: 6543,
	pgbouncer: 6432,
	migrations: 7654,
	zero: 4848,
	syncWorker: 8787,
} as const

export const DOTCOM_DEV_READINESS_TIMEOUT_MS = 180_000
export const DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS = DOTCOM_DEV_READINESS_TIMEOUT_MS * 2 + 60_000
export const DOTCOM_DEV_APP_READY_TIMEOUT_MS =
	DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS + DOTCOM_DEV_READINESS_TIMEOUT_MS * 2

// The dotcom dev stack uses a single, fixed set of identifiers rather than per-branch ones. The
// stack binds fixed host ports, so only one copy can run at a time anyway; fixed names mean your
// local database and state persist across branch switches, and there are no per-branch stacks left
// to orphan and fight over those ports.
export const DOTCOM_DEV_COMPOSE_PROJECT = 'tldraw_dotcom_dev'
export const DOTCOM_DEV_POSTGRES_VOLUME = `${DOTCOM_DEV_COMPOSE_PROJECT}_tlapp_pgdata`
export const DOTCOM_DEV_ZERO_REPLICA_FILE = '/tmp/tldraw-dotcom-zero-dev.db'
export const DOTCOM_DEV_WRANGLER_STATE_DIR = 'state-dev'

// Identifiers for resources left behind by older dev setups (per-branch scoping and the original
// `docker` compose project). `yarn dev-app` reconciles these on startup and `dev-app:clean:all`
// removes them.
export const DOTCOM_DEV_DOCKER_PROJECT_PREFIX = 'tldraw_dotcom_'
export const DOTCOM_DEV_POSTGRES_VOLUME_SUFFIX = '_tlapp_pgdata'
export const DOTCOM_DEV_ZERO_REPLICA_FILE_PREFIX = 'tldraw-dotcom-zero-'
export const DOTCOM_DEV_WRANGLER_STATE_PREFIX = 'state'
export const DOTCOM_DEV_LEGACY_DOCKER_PROJECT_NAMES = ['docker']
export const DOTCOM_DEV_LEGACY_POSTGRES_VOLUME_NAMES = ['docker_tlapp_pgdata']

export interface DotcomDevEnv {
	repoRoot: string
	dotcomDir: string
	zeroCacheDir: string
	syncWorkerDir: string
	dockerComposeFile: string
	dockerEnvFile: string
	composeProjectName: string
	postgresVolumeName: string
	zeroReplicaFile: string
	zeroEnv: Record<string, string>
	schemaFile: string
	schemaSourceFile: string
	wranglerPersistDir: string
	resetLocalStateUrl: string
}

export interface DotcomDevCleanTargets {
	composeProjectName: string
	postgresVolumeName: string
	zeroReplicaFiles: string[]
	schemaFile: string
	wranglerPersistDir: string
}

export interface DotcomDevCleanAllTargets {
	composeProjectNamePrefix: string
	legacyComposeProjectNames: string[]
	postgresVolumeNamePrefix: string
	postgresVolumeNameSuffix: string
	legacyPostgresVolumeNames: string[]
	zeroReplicaDir: string
	zeroReplicaFilePrefix: string
	schemaFile: string
	wranglerStateDir: string
	wranglerPersistDirPrefix: string
}

export function buildDotcomDevEnv({
	repoRoot = resolve(thisDir, '../../..'),
}: {
	repoRoot?: string
} = {}): DotcomDevEnv {
	const dotcomDir = join(repoRoot, 'apps/dotcom')
	const zeroCacheDir = join(dotcomDir, 'zero-cache')
	const syncWorkerDir = join(dotcomDir, 'sync-worker')

	return {
		repoRoot,
		dotcomDir,
		zeroCacheDir,
		syncWorkerDir,
		dockerComposeFile: join(zeroCacheDir, 'docker/docker-compose.yml'),
		dockerEnvFile: join(zeroCacheDir, '.env'),
		composeProjectName: DOTCOM_DEV_COMPOSE_PROJECT,
		postgresVolumeName: DOTCOM_DEV_POSTGRES_VOLUME,
		zeroReplicaFile: DOTCOM_DEV_ZERO_REPLICA_FILE,
		zeroEnv: {
			ZERO_REPLICA_FILE: DOTCOM_DEV_ZERO_REPLICA_FILE,
			ZERO_NUM_SYNC_WORKERS: '1',
		},
		schemaFile: join(zeroCacheDir, '.schema.js'),
		schemaSourceFile: join(repoRoot, 'packages/dotcom-shared/src/tlaSchema.ts'),
		wranglerPersistDir: join(syncWorkerDir, '.wrangler', DOTCOM_DEV_WRANGLER_STATE_DIR),
		resetLocalStateUrl: `http://localhost:${DOTCOM_DEV_PORTS.client}/dev/reset-local-state`,
	}
}

export function getDotcomDevEnv() {
	return buildDotcomDevEnv()
}

/**
 * Check whether the Docker daemon is reachable. The dotcom dev stack (Postgres, PgBouncer, Zero)
 * runs in Docker, so with no daemon `docker compose up` never starts and the dev/e2e processes
 * otherwise sit polling "Waiting for migrations..." until they time out minutes later. Probing here
 * lets callers fail fast with an actionable message instead. Returns `{ ok: true }` when the daemon
 * answers, or `{ ok: false, message }` describing why it could not be reached.
 */
export function checkDockerDaemon(): { ok: boolean; message?: string } {
	const result = spawnSync('docker', ['info'], { stdio: 'ignore' })
	if (result.error) {
		const notFound = (result.error as NodeJS.ErrnoException).code === 'ENOENT'
		return {
			ok: false,
			message: notFound
				? 'Docker CLI not found. Install Docker Desktop and make sure `docker` is on your PATH.'
				: `Could not run Docker: ${result.error.message}`,
		}
	}
	if (result.status !== 0) {
		return {
			ok: false,
			message:
				'Docker daemon is not running. Start Docker Desktop (or your Docker daemon) and try again.',
		}
	}
	return { ok: true }
}

/**
 * Exit immediately with a clear message when Docker is unavailable. Call this before any work that
 * needs the Docker-based dotcom dev stack, so a missing daemon fails fast instead of hanging on
 * readiness polling. `context` names the thing that needs Docker, for the error message.
 */
export function assertDockerDaemonRunning(context: string) {
	const result = checkDockerDaemon()
	if (result.ok) return
	// eslint-disable-next-line no-console
	console.error(`\nCannot start ${context}: ${result.message}\n`)
	process.exit(1)
}

export function getDotcomDevCleanTargets(env: DotcomDevEnv): DotcomDevCleanTargets {
	return {
		composeProjectName: env.composeProjectName,
		postgresVolumeName: env.postgresVolumeName,
		zeroReplicaFiles: [
			env.zeroReplicaFile,
			`${env.zeroReplicaFile}-shm`,
			`${env.zeroReplicaFile}-wal`,
		],
		schemaFile: env.schemaFile,
		wranglerPersistDir: env.wranglerPersistDir,
	}
}

export function getDotcomDevCleanAllTargets(env: DotcomDevEnv): DotcomDevCleanAllTargets {
	return {
		composeProjectNamePrefix: DOTCOM_DEV_DOCKER_PROJECT_PREFIX,
		legacyComposeProjectNames: DOTCOM_DEV_LEGACY_DOCKER_PROJECT_NAMES,
		postgresVolumeNamePrefix: DOTCOM_DEV_DOCKER_PROJECT_PREFIX,
		postgresVolumeNameSuffix: DOTCOM_DEV_POSTGRES_VOLUME_SUFFIX,
		legacyPostgresVolumeNames: DOTCOM_DEV_LEGACY_POSTGRES_VOLUME_NAMES,
		zeroReplicaDir: dirname(env.zeroReplicaFile),
		zeroReplicaFilePrefix: DOTCOM_DEV_ZERO_REPLICA_FILE_PREFIX,
		schemaFile: env.schemaFile,
		wranglerStateDir: join(env.syncWorkerDir, '.wrangler'),
		wranglerPersistDirPrefix: DOTCOM_DEV_WRANGLER_STATE_PREFIX,
	}
}
