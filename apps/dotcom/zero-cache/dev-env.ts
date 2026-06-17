import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const thisDir = dirname(fileURLToPath(import.meta.url))

// Each dev stack (one per git worktree) gets its own contiguous block of ports so multiple stacks
// can run side by side. A service's port is:
//
//   DOTCOM_DEV_PORT_BASE + instance * DOTCOM_DEV_INSTANCE_BLOCK_SIZE + slot
//
// So instance 0 starts at 3000, instance 1 at 3100, instance 2 at 3200, and so on. The client (the
// URL you open) sits at slot 0, so instance 0's client stays on the familiar localhost:3000.
export const DOTCOM_DEV_PORT_BASE = 3000
export const DOTCOM_DEV_INSTANCE_BLOCK_SIZE = 100
export const DOTCOM_DEV_MAX_INSTANCES = 50

// Slot of each service within an instance's block. Zero also binds `zero + 1` (change-streamer) and
// `zero + 2` (litestream) - those follow `ZERO_PORT` automatically (see zero-cache normalize.ts) -
// so slots 3 and 4 are deliberately left free next to `zero`. There is plenty of room in the block
// (0..99) for new services.
export const DOTCOM_DEV_PORT_SLOTS = {
	client: 0,
	syncWorker: 1,
	zero: 2,
	postgres: 5,
	pgbouncer: 6,
	migrations: 7,
	imageResizeWorker: 8,
	assetUploadWorker: 9,
	userContentWorker: 10,
	syncWorkerInspector: 11,
	imageResizeWorkerInspector: 12,
	assetUploadWorkerInspector: 13,
	userContentWorkerInspector: 14,
} as const

export type DotcomDevPortName = keyof typeof DOTCOM_DEV_PORT_SLOTS
export type DotcomDevPorts = Record<DotcomDevPortName, number>

export const DOTCOM_DEV_READINESS_TIMEOUT_MS = 180_000
export const DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS = DOTCOM_DEV_READINESS_TIMEOUT_MS * 2 + 60_000
export const DOTCOM_DEV_APP_READY_TIMEOUT_MS =
	DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS + DOTCOM_DEV_READINESS_TIMEOUT_MS * 2

// Each dev stack scopes its Docker, Zero, and Wrangler resources by an instance label so that
// per-worktree stacks keep their own database, replica, and state. Instance 0 keeps the historical
// `dev` identifiers, so the default stack's data and ports are unchanged.
export const DOTCOM_DEV_DOCKER_PROJECT_PREFIX = 'tldraw_dotcom_'
export const DOTCOM_DEV_POSTGRES_VOLUME_SUFFIX = '_tlapp_pgdata'
export const DOTCOM_DEV_ZERO_REPLICA_FILE_PREFIX = 'tldraw-dotcom-zero-'
export const DOTCOM_DEV_WRANGLER_STATE_PREFIX = 'state'
export const DOTCOM_DEV_WRANGLER_REGISTRY_PREFIX = 'registry'

// Identifiers for resources left behind by older dev setups (the original `docker` compose project).
// `yarn dev-app:clean:all` removes these alongside any current per-instance state.
export const DOTCOM_DEV_LEGACY_DOCKER_PROJECT_NAMES = ['docker']
export const DOTCOM_DEV_LEGACY_POSTGRES_VOLUME_NAMES = ['docker_tlapp_pgdata']

/** The instance-0 identifiers, kept for reference and backwards compatibility. */
export const DOTCOM_DEV_COMPOSE_PROJECT = `${DOTCOM_DEV_DOCKER_PROJECT_PREFIX}dev`
export const DOTCOM_DEV_POSTGRES_VOLUME = `${DOTCOM_DEV_COMPOSE_PROJECT}${DOTCOM_DEV_POSTGRES_VOLUME_SUFFIX}`
export const DOTCOM_DEV_ZERO_REPLICA_FILE = `/tmp/${DOTCOM_DEV_ZERO_REPLICA_FILE_PREFIX}dev.db`

/** The first port in an instance's block. */
export function getDotcomDevPortBlockStart(instance: number) {
	return DOTCOM_DEV_PORT_BASE + instance * DOTCOM_DEV_INSTANCE_BLOCK_SIZE
}

export function getDotcomDevPorts(instance: number): DotcomDevPorts {
	const blockStart = getDotcomDevPortBlockStart(instance)
	return Object.fromEntries(
		Object.entries(DOTCOM_DEV_PORT_SLOTS).map(([name, slot]) => [name, blockStart + slot])
	) as DotcomDevPorts
}

/** The label used to scope an instance's Docker, Zero, and Wrangler resources. */
export function getDotcomDevInstanceLabel(instance: number) {
	return instance === 0 ? 'dev' : `dev${instance}`
}

export function assertValidDotcomDevInstance(instance: number) {
	if (!Number.isInteger(instance) || instance < 0 || instance >= DOTCOM_DEV_MAX_INSTANCES) {
		throw new Error(
			`Invalid dotcom dev instance "${instance}". Expected an integer in 0..${DOTCOM_DEV_MAX_INSTANCES - 1}.`
		)
	}
	return instance
}

function readInstanceFromEnv() {
	const raw = process.env.DOTCOM_DEV_INSTANCE
	if (raw === undefined || raw === '') return 0
	return assertValidDotcomDevInstance(Number(raw))
}

export interface DotcomDevEnv {
	instance: number
	portBlockStart: number
	ports: DotcomDevPorts
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
	dockerEnv: Record<string, string>
	schemaFile: string
	schemaSourceFile: string
	wranglerPersistDir: string
	wranglerRegistryDir: string
	resetLocalStateUrl: string
}

export interface DotcomDevCleanTargets {
	composeProjectName: string
	postgresVolumeName: string
	zeroReplicaFiles: string[]
	schemaFile: string
	wranglerPersistDir: string
	wranglerRegistryDir: string
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
	wranglerRegistryDirPrefix: string
}

export function buildDotcomDevEnv({
	repoRoot = resolve(thisDir, '../../..'),
	instance = readInstanceFromEnv(),
}: {
	repoRoot?: string
	instance?: number
} = {}): DotcomDevEnv {
	assertValidDotcomDevInstance(instance)

	const dotcomDir = join(repoRoot, 'apps/dotcom')
	const zeroCacheDir = join(dotcomDir, 'zero-cache')
	const syncWorkerDir = join(dotcomDir, 'sync-worker')

	const ports = getDotcomDevPorts(instance)
	const label = getDotcomDevInstanceLabel(instance)

	const composeProjectName = `${DOTCOM_DEV_DOCKER_PROJECT_PREFIX}${label}`
	const postgresVolumeName = `${composeProjectName}${DOTCOM_DEV_POSTGRES_VOLUME_SUFFIX}`
	const zeroReplicaFile = `/tmp/${DOTCOM_DEV_ZERO_REPLICA_FILE_PREFIX}${label}.db`
	const upstreamDb = `postgresql://user:password@127.0.0.1:${ports.postgres}/postgres`

	return {
		instance,
		portBlockStart: getDotcomDevPortBlockStart(instance),
		ports,
		repoRoot,
		dotcomDir,
		zeroCacheDir,
		syncWorkerDir,
		dockerComposeFile: join(zeroCacheDir, 'docker/docker-compose.yml'),
		dockerEnvFile: join(zeroCacheDir, '.env'),
		composeProjectName,
		postgresVolumeName,
		zeroReplicaFile,
		zeroEnv: {
			ZERO_PORT: String(ports.zero),
			ZERO_REPLICA_FILE: zeroReplicaFile,
			ZERO_NUM_SYNC_WORKERS: '1',
			ZERO_UPSTREAM_DB: upstreamDb,
			ZERO_CVR_DB: upstreamDb,
			ZERO_CHANGE_DB: upstreamDb,
			ZERO_MUTATE_URL: `http://localhost:${ports.syncWorker}/app/zero/mutate`,
			ZERO_QUERY_URL: `http://localhost:${ports.syncWorker}/app/zero/query`,
			VITE_PUBLIC_SERVER: `http://localhost:${ports.zero}`,
		},
		// Substituted into docker/docker-compose.yml so each instance publishes its own host ports.
		dockerEnv: {
			TLAPP_POSTGRES_PORT: String(ports.postgres),
			TLAPP_PGBOUNCER_PORT: String(ports.pgbouncer),
		},
		schemaFile: join(zeroCacheDir, '.schema.js'),
		schemaSourceFile: join(repoRoot, 'packages/dotcom-shared/src/tlaSchema.ts'),
		wranglerPersistDir: join(
			syncWorkerDir,
			'.wrangler',
			`${DOTCOM_DEV_WRANGLER_STATE_PREFIX}-${label}`
		),
		// Per-instance Wrangler service-binding registry. Without this, instances share the global
		// registry and a second stack's workers re-register the shared worker names (e.g.
		// `dev-tldraw-multiplayer`), cross-wiring one instance's image/usercontent worker to another
		// instance's sync worker.
		wranglerRegistryDir: join(
			syncWorkerDir,
			'.wrangler',
			`${DOTCOM_DEV_WRANGLER_REGISTRY_PREFIX}-${label}`
		),
		resetLocalStateUrl: `http://localhost:${ports.client}/dev/reset-local-state`,
	}
}

export function getDotcomDevEnv() {
	return buildDotcomDevEnv()
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
		wranglerRegistryDir: env.wranglerRegistryDir,
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
		wranglerRegistryDirPrefix: DOTCOM_DEV_WRANGLER_REGISTRY_PREFIX,
	}
}
