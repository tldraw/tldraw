import { describe, expect, it } from 'vitest'
import {
	DOTCOM_DEV_APP_READY_TIMEOUT_MS,
	DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS,
	DOTCOM_DEV_READINESS_TIMEOUT_MS,
	buildDotcomDevEnv,
	getBranchInfoFromValues,
	getDotcomDevCleanAllTargets,
	getDotcomDevCleanTargets,
	sanitizeBranchKey,
} from './dev-env'

describe('dotcom dev env', () => {
	it('sanitizes branch names for Docker and file paths', () => {
		expect(sanitizeBranchKey('feature/Zero Dev DX')).toMatch(/^feature-zero-dev-dx-[a-f0-9]{8}$/)
		expect(sanitizeBranchKey('STEPHEN+review.fix')).toMatch(/^stephen-review-fix-[a-f0-9]{8}$/)
		expect(sanitizeBranchKey('---', 'fallback-ref')).toBe('fallback-ref')
	})

	it('keeps branch keys distinct when branch names sanitize to the same base', () => {
		const slash = sanitizeBranchKey('feature/foo')
		const plus = sanitizeBranchKey('feature+foo')
		const safe = sanitizeBranchKey('feature-foo')

		expect(slash).toMatch(/^feature-foo-[a-f0-9]{8}$/)
		expect(plus).toMatch(/^feature-foo-[a-f0-9]{8}$/)
		expect(safe).toBe('feature-foo')
		expect(new Set([slash, plus, safe]).size).toBe(3)
	})

	it('falls back to the short commit SHA when there is no branch name', () => {
		expect(
			getBranchInfoFromValues({
				branchName: '',
				shortCommitSha: 'abc1234',
			})
		).toEqual({
			branchName: null,
			shortCommitSha: 'abc1234',
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

	it('allows client readiness to cover Zero startup stages before Vite starts', () => {
		expect(DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS).toBe(
			DOTCOM_DEV_READINESS_TIMEOUT_MS * 2 + 60_000
		)
		expect(DOTCOM_DEV_APP_READY_TIMEOUT_MS).toBe(
			DOTCOM_DEV_MIGRATIONS_READY_TIMEOUT_MS + DOTCOM_DEV_READINESS_TIMEOUT_MS * 2
		)
	})

	it('derives branch-scoped Zero and Docker values', () => {
		const env = buildDotcomDevEnv({
			repoRoot: '/repo',
			branchInfo: getBranchInfoFromValues({
				branchName: 'feature/Zero Dev DX',
				shortCommitSha: 'abc1234',
			}),
		})
		const branchKey = sanitizeBranchKey('feature/Zero Dev DX')

		expect(env.branchKey).toBe(branchKey)
		expect(env.composeProjectName).toBe(`tldraw_dotcom_${branchKey}`)
		expect(env.postgresVolumeName).toBe(`tldraw_dotcom_${branchKey}_tlapp_pgdata`)
		expect(env.zeroEnv).toMatchObject({
			ZERO_REPLICA_FILE: `/tmp/tldraw-dotcom-zero-${branchKey}.db`,
			ZERO_NUM_SYNC_WORKERS: '1',
		})
		expect(env.wranglerPersistDir).toBe(
			`/repo/apps/dotcom/sync-worker/.wrangler/state-${branchKey}`
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

	it('selects all branch-scoped clean target patterns plus legacy Docker state', () => {
		const env = buildDotcomDevEnv({
			repoRoot: '/repo',
			branchInfo: getBranchInfoFromValues({
				branchName: 'main',
				shortCommitSha: 'abc1234',
			}),
		})

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
			wranglerPersistDirPrefix: 'state-',
			legacyWranglerStateDir: '/repo/apps/dotcom/sync-worker/.wrangler/state',
		})
	})
})
