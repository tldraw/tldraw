import { describe, expect, it } from 'vitest'
import {
	DOTCOM_DEV_APP_READY_TIMEOUT_MS,
	DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS,
	DOTCOM_DEV_READINESS_TIMEOUT_MS,
	buildDotcomDevEnv,
	getDotcomDevCleanAllTargets,
	getDotcomDevCleanTargets,
} from './dev-env'

describe('dotcom dev env', () => {
	it('allows client readiness to cover Zero startup stages before Vite starts', () => {
		expect(DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS).toBe(
			DOTCOM_DEV_READINESS_TIMEOUT_MS * 2 + 60_000
		)
		expect(DOTCOM_DEV_APP_READY_TIMEOUT_MS).toBe(
			DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS + DOTCOM_DEV_READINESS_TIMEOUT_MS * 2
		)
	})

	it('uses fixed, branch-independent Zero and Docker values', () => {
		const env = buildDotcomDevEnv({ repoRoot: '/repo' })

		expect(env.composeProjectName).toBe('tldraw_dotcom_dev')
		expect(env.postgresVolumeName).toBe('tldraw_dotcom_dev_tlapp_pgdata')
		expect(env.zeroEnv).toEqual({
			ZERO_REPLICA_FILE: '/tmp/tldraw-dotcom-zero-dev.db',
			ZERO_NUM_SYNC_WORKERS: '1',
			ZERO_CVR_MAX_CONNS: '6',
			ZERO_UPSTREAM_MAX_CONNS: '6',
			NODE_ENV: 'development',
		})
		expect(env.wranglerPersistDir).toBe('/repo/apps/dotcom/sync-worker/.wrangler/state-dev')
	})

	it('selects clean targets for the single dev stack', () => {
		const env = buildDotcomDevEnv({ repoRoot: '/repo' })

		expect(getDotcomDevCleanTargets(env)).toEqual({
			composeProjectName: 'tldraw_dotcom_dev',
			postgresVolumeName: 'tldraw_dotcom_dev_tlapp_pgdata',
			zeroReplicaFiles: [
				'/tmp/tldraw-dotcom-zero-dev.db',
				'/tmp/tldraw-dotcom-zero-dev.db-shm',
				'/tmp/tldraw-dotcom-zero-dev.db-wal',
			],
			schemaFile: '/repo/apps/dotcom/zero-cache/.schema.js',
			wranglerPersistDir: '/repo/apps/dotcom/sync-worker/.wrangler/state-dev',
		})
	})

	it('selects clean-all target patterns that also cover legacy per-branch state', () => {
		const env = buildDotcomDevEnv({ repoRoot: '/repo' })

		expect(getDotcomDevCleanAllTargets(env)).toEqual({
			composeProjectNamePrefix: 'tldraw_dotcom_',
			legacyComposeProjectNames: ['docker'],
			postgresVolumeNamePrefix: 'tldraw_dotcom_',
			postgresVolumeNameSuffix: '_tlapp_pgdata',
			legacyPostgresVolumeNames: ['docker_tlapp_pgdata'],
			zeroReplicaDir: '/tmp',
			zeroReplicaFilePrefix: 'tldraw-dotcom-zero-',
			schemaFile: '/repo/apps/dotcom/zero-cache/.schema.js',
			wranglerStateDir: '/repo/apps/dotcom/sync-worker/.wrangler',
			wranglerPersistDirPrefix: 'state',
		})
	})
})
