import { describe, expect, it } from 'vitest'
import {
	DOTCOM_DEV_APP_READY_TIMEOUT_MS,
	DOTCOM_DEV_INSTANCE_BLOCK_SIZE,
	DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS,
	DOTCOM_DEV_PORT_BASE,
	DOTCOM_DEV_READINESS_TIMEOUT_MS,
	buildDotcomDevEnv,
	getDotcomDevCleanAllTargets,
	getDotcomDevCleanTargets,
	getDotcomDevPorts,
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

	it('keeps the client on 3000 and the historical identifiers for instance 0', () => {
		const env = buildDotcomDevEnv({ repoRoot: '/repo', instance: 0 })

		expect(env.instance).toBe(0)
		expect(env.portBlockStart).toBe(DOTCOM_DEV_PORT_BASE)
		expect(env.ports.client).toBe(3000)
		expect(env.composeProjectName).toBe('tldraw_dotcom_dev')
		expect(env.postgresVolumeName).toBe('tldraw_dotcom_dev_tlapp_pgdata')
		expect(env.zeroEnv).toMatchObject({
			ZERO_PORT: String(env.ports.zero),
			ZERO_REPLICA_FILE: '/tmp/tldraw-dotcom-zero-dev.db',
			ZERO_NUM_SYNC_WORKERS: '1',
			ZERO_UPSTREAM_DB: `postgresql://user:password@127.0.0.1:${env.ports.postgres}/postgres`,
		})
		expect(env.dockerEnv).toEqual({
			TLAPP_POSTGRES_PORT: String(env.ports.postgres),
			TLAPP_PGBOUNCER_PORT: String(env.ports.pgbouncer),
		})
		expect(env.wranglerPersistDir).toBe('/repo/apps/dotcom/sync-worker/.wrangler/state-dev')
		expect(env.wranglerRegistryDir).toBe('/repo/apps/dotcom/sync-worker/.wrangler/registry-dev')
	})

	it('gives each instance its own contiguous 100-port block and scopes every identifier', () => {
		const env = buildDotcomDevEnv({ repoRoot: '/repo', instance: 1 })

		expect(env.portBlockStart).toBe(DOTCOM_DEV_PORT_BASE + DOTCOM_DEV_INSTANCE_BLOCK_SIZE)
		expect(env.ports.client).toBe(3100)
		expect(env.ports.syncWorker).toBe(3101)
		expect(env.ports.zero).toBe(3102)
		expect(env.ports.postgres).toBe(3105)
		expect(env.composeProjectName).toBe('tldraw_dotcom_dev1')
		expect(env.postgresVolumeName).toBe('tldraw_dotcom_dev1_tlapp_pgdata')
		expect(env.zeroReplicaFile).toBe('/tmp/tldraw-dotcom-zero-dev1.db')
		expect(env.zeroEnv.ZERO_PORT).toBe('3102')
		expect(env.dockerEnv.TLAPP_POSTGRES_PORT).toBe('3105')
		expect(env.wranglerPersistDir).toBe('/repo/apps/dotcom/sync-worker/.wrangler/state-dev1')
		expect(env.wranglerRegistryDir).toBe('/repo/apps/dotcom/sync-worker/.wrangler/registry-dev1')
	})

	it('leaves zero+1 and zero+2 free for the change-streamer and litestream', () => {
		const ports = getDotcomDevPorts(0)
		const reserved = [ports.zero + 1, ports.zero + 2]
		const assigned = Object.values(ports)
		expect(assigned.some((port) => reserved.includes(port))).toBe(false)
	})

	it('never lets two instances collide on a port', () => {
		const a = Object.values(getDotcomDevPorts(0))
		const b = Object.values(getDotcomDevPorts(1))
		expect(a.some((port) => b.includes(port))).toBe(false)
	})

	it('rejects out-of-range instances', () => {
		expect(() => buildDotcomDevEnv({ instance: -1 })).toThrow()
		expect(() => buildDotcomDevEnv({ instance: 999 })).toThrow()
	})

	it('selects clean targets for the resolved instance', () => {
		const env = buildDotcomDevEnv({ repoRoot: '/repo', instance: 0 })

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
			wranglerRegistryDir: '/repo/apps/dotcom/sync-worker/.wrangler/registry-dev',
		})
	})

	it('selects clean-all target patterns that also cover legacy per-branch state', () => {
		const env = buildDotcomDevEnv({ repoRoot: '/repo', instance: 0 })

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
			wranglerRegistryDirPrefix: 'registry',
		})
	})
})
