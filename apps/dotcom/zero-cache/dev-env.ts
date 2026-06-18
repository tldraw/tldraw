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
