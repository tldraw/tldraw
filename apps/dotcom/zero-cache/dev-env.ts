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

	const key: string = sanitized || sanitizeBranchKey(fallback, 'local')
	if (key.length <= MAX_BRANCH_KEY_LENGTH) return key

	const hash = createHash('sha1').update(raw).digest('hex').slice(0, 8)
	const prefix = key.slice(0, MAX_BRANCH_KEY_LENGTH - hash.length - 1).replace(/-+$/g, '')
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
	const composeProjectName = `tldraw_dotcom_${branchInfo.branchKey}`
	const zeroReplicaFile = `/tmp/tldraw-dotcom-zero-${branchInfo.branchKey}.db`

	return {
		...branchInfo,
		repoRoot,
		dotcomDir,
		zeroCacheDir,
		syncWorkerDir,
		dockerComposeFile: join(zeroCacheDir, 'docker/docker-compose.yml'),
		dockerEnvFile: join(zeroCacheDir, '.env'),
		composeProjectName,
		postgresVolumeName: `${composeProjectName}_tlapp_pgdata`,
		zeroReplicaFile,
		zeroEnv: {
			ZERO_REPLICA_FILE: zeroReplicaFile,
			ZERO_NUM_SYNC_WORKERS: '1',
		},
		schemaFile: join(zeroCacheDir, '.schema.js'),
		schemaSourceFile: join(repoRoot, 'packages/dotcom-shared/src/tlaSchema.ts'),
		wranglerPersistDir: join(syncWorkerDir, '.wrangler', `state-${branchInfo.branchKey}`),
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
