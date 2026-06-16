import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
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
export const DOTCOM_DEV_DOCKER_PROJECT_PREFIX = 'tldraw_dotcom_'
export const DOTCOM_DEV_POSTGRES_VOLUME_SUFFIX = '_tlapp_pgdata'
export const DOTCOM_DEV_ZERO_REPLICA_FILE_PREFIX = 'tldraw-dotcom-zero-'
export const DOTCOM_DEV_WRANGLER_STATE_PREFIX = 'state-'
export const DOTCOM_DEV_LEGACY_DOCKER_PROJECT_NAMES = ['docker']
export const DOTCOM_DEV_LEGACY_POSTGRES_VOLUME_NAMES = ['docker_tlapp_pgdata']

const MAX_BRANCH_KEY_LENGTH = 48

export interface DotcomDevBranchInfo {
	branchName: string | null
	shortCommitSha: string | null
	branchKey: string
}

export interface DotcomDevEnv {
	branchName: string | null
	shortCommitSha: string | null
	branchKey: string
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
	legacyWranglerStateDir: string
	resetLocalStateUrl: string
}

export interface DotcomDevCleanTargets {
	composeProjectName: string
	postgresVolumeName: string
	zeroReplicaFiles: string[]
	schemaFile: string
	wranglerPersistDir: string
	legacyWranglerStateDir: string
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
	legacyWranglerStateDir: string
}

function normalizeBranchSource(value: string | null | undefined) {
	return value?.trim() || ''
}

export function sanitizeBranchKey(value: string | null | undefined, fallback = 'local'): string {
	const raw = normalizeBranchSource(value) || fallback
	const sanitized = raw
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-+/g, '-')

	if (!sanitized) return sanitizeBranchKey(fallback, 'local')
	if (sanitized === raw && sanitized.length <= MAX_BRANCH_KEY_LENGTH) return sanitized

	const hash = createHash('sha1').update(raw).digest('hex').slice(0, 8)
	const prefix = sanitized.slice(0, MAX_BRANCH_KEY_LENGTH - hash.length - 1).replace(/-+$/g, '')
	return `${prefix}-${hash}`
}

export function getBranchInfoFromValues({
	branchName,
	shortCommitSha,
}: {
	branchName?: string | null
	shortCommitSha?: string | null
}): DotcomDevBranchInfo {
	const normalizedBranchName = normalizeBranchSource(branchName)
	const normalizedShortCommitSha = normalizeBranchSource(shortCommitSha)
	const source = normalizedBranchName || normalizedShortCommitSha || 'local'

	return {
		branchName: normalizedBranchName || null,
		shortCommitSha: normalizedShortCommitSha || null,
		branchKey: sanitizeBranchKey(source),
	}
}

function readGit(args: string[], cwd: string) {
	try {
		return execFileSync('git', args, {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	} catch {
		return ''
	}
}

export function getCurrentDotcomDevBranchInfo(cwd = resolve(thisDir, '../../..')) {
	const branchName = readGit(['branch', '--show-current'], cwd)
	const shortCommitSha = readGit(['rev-parse', '--short', 'HEAD'], cwd)
	return getBranchInfoFromValues({ branchName, shortCommitSha })
}

export function buildDotcomDevEnv({
	branchInfo,
	repoRoot = resolve(thisDir, '../../..'),
}: {
	branchInfo: DotcomDevBranchInfo
	repoRoot?: string
}): DotcomDevEnv {
	const dotcomDir = join(repoRoot, 'apps/dotcom')
	const zeroCacheDir = join(dotcomDir, 'zero-cache')
	const syncWorkerDir = join(dotcomDir, 'sync-worker')
	const composeProjectName = `${DOTCOM_DEV_DOCKER_PROJECT_PREFIX}${branchInfo.branchKey}`
	const zeroReplicaFile = join(
		'/tmp',
		`${DOTCOM_DEV_ZERO_REPLICA_FILE_PREFIX}${branchInfo.branchKey}.db`
	)

	return {
		...branchInfo,
		repoRoot,
		dotcomDir,
		zeroCacheDir,
		syncWorkerDir,
		dockerComposeFile: join(zeroCacheDir, 'docker/docker-compose.yml'),
		dockerEnvFile: join(zeroCacheDir, '.env'),
		composeProjectName,
		postgresVolumeName: `${composeProjectName}${DOTCOM_DEV_POSTGRES_VOLUME_SUFFIX}`,
		zeroReplicaFile,
		zeroEnv: {
			ZERO_REPLICA_FILE: zeroReplicaFile,
			ZERO_NUM_SYNC_WORKERS: '1',
		},
		schemaFile: join(zeroCacheDir, '.schema.js'),
		schemaSourceFile: join(repoRoot, 'packages/dotcom-shared/src/tlaSchema.ts'),
		wranglerPersistDir: join(
			syncWorkerDir,
			'.wrangler',
			`${DOTCOM_DEV_WRANGLER_STATE_PREFIX}${branchInfo.branchKey}`
		),
		legacyWranglerStateDir: join(syncWorkerDir, '.wrangler', 'state'),
		resetLocalStateUrl: `http://localhost:${DOTCOM_DEV_PORTS.client}/dev/reset-local-state`,
	}
}

export function getDotcomDevEnv(cwd?: string) {
	const repoRoot = resolve(thisDir, '../../..')
	return buildDotcomDevEnv({
		branchInfo: getCurrentDotcomDevBranchInfo(cwd ?? repoRoot),
		repoRoot,
	})
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
		legacyWranglerStateDir: env.legacyWranglerStateDir,
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
		legacyWranglerStateDir: env.legacyWranglerStateDir,
	}
}
