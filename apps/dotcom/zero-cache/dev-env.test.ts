import { describe, expect, it } from 'vitest'
import {
	DOTCOM_DEV_APP_READY_TIMEOUT_MS,
	DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS,
	DOTCOM_DEV_READINESS_TIMEOUT_MS,
	buildDotcomDevEnv,
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
		expect(env.zeroEnv).toMatchObject({
			ZERO_REPLICA_FILE: '/tmp/tldraw-dotcom-zero-dev.db',
			ZERO_NUM_SYNC_WORKERS: '1',
		})
		expect(env.wranglerPersistDir).toBe('/repo/apps/dotcom/sync-worker/.wrangler/state-dev')
	})
})
