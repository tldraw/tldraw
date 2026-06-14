import { describe, expect, it } from 'vitest'
import {
	buildDotcomDevEnv,
	getBranchInfoFromValues,
	getDotcomDevCleanTargets,
	sanitizeBranchKey,
} from './dev-env'

describe('dotcom dev env', () => {
	it('sanitizes branch names for Docker and file paths', () => {
		expect(sanitizeBranchKey('feature/Zero Dev DX')).toBe('feature-zero-dev-dx')
		expect(sanitizeBranchKey('STEPHEN+review.fix')).toBe('stephen-review-fix')
		expect(sanitizeBranchKey('---', 'fallback-ref')).toBe('fallback-ref')
	})

	it('falls back to the short commit SHA when there is no branch name', () => {
		expect(
			getBranchInfoFromValues({
				branchName: '',
				shortCommitSha: 'ABC1234',
			})
		).toEqual({
			branchName: null,
			shortCommitSha: 'ABC1234',
			branchKey: 'abc1234',
		})
	})

	it('keeps long branch keys deterministic and bounded', () => {
		const first = sanitizeBranchKey('feature/' + 'very-long-branch-name-'.repeat(6))
		const second = sanitizeBranchKey('feature/' + 'very-long-branch-name-'.repeat(6))

		expect(first).toBe(second)
		expect(first.length).toBeLessThanOrEqual(48)
		expect(first).toMatch(/-[a-f0-9]{8}$/)
	})

	it('derives branch-scoped Zero and Docker values', () => {
		const env = buildDotcomDevEnv({
			repoRoot: '/repo',
			branchInfo: getBranchInfoFromValues({
				branchName: 'feature/Zero Dev DX',
				shortCommitSha: 'abc1234',
			}),
		})

		expect(env.branchKey).toBe('feature-zero-dev-dx')
		expect(env.composeProjectName).toBe('tldraw_dotcom_feature-zero-dev-dx')
		expect(env.postgresVolumeName).toBe('tldraw_dotcom_feature-zero-dev-dx_tlapp_pgdata')
		expect(env.zeroEnv).toMatchObject({
			ZERO_REPLICA_FILE: '/tmp/tldraw-dotcom-zero-feature-zero-dev-dx.db',
			ZERO_NUM_SYNC_WORKERS: '1',
		})
		expect(env.wranglerPersistDir).toBe(
			'/repo/apps/dotcom/sync-worker/.wrangler/state-feature-zero-dev-dx'
		)
	})

	it('selects only branch-scoped clean targets plus legacy Wrangler state', () => {
		const env = buildDotcomDevEnv({
			repoRoot: '/repo',
			branchInfo: getBranchInfoFromValues({
				branchName: 'main',
				shortCommitSha: 'abc1234',
			}),
		})

		expect(getDotcomDevCleanTargets(env)).toEqual({
			composeProjectName: 'tldraw_dotcom_main',
			postgresVolumeName: 'tldraw_dotcom_main_tlapp_pgdata',
			zeroReplicaFiles: [
				'/tmp/tldraw-dotcom-zero-main.db',
				'/tmp/tldraw-dotcom-zero-main.db-shm',
				'/tmp/tldraw-dotcom-zero-main.db-wal',
			],
			schemaFile: '/repo/apps/dotcom/zero-cache/.schema.js',
			wranglerPersistDir: '/repo/apps/dotcom/sync-worker/.wrangler/state-main',
			legacyWranglerStateDir: '/repo/apps/dotcom/sync-worker/.wrangler/state',
		})
	})
})
