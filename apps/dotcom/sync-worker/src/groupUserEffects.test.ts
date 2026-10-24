import { TlaEffectOutbox, TlaGroupUser } from '@tldraw/dotcom-shared'
import { describe, expect, it, vi } from 'vitest'
import { GroupUserEffectDeps, MAX_REVOKE_FANOUT, processGroupUserEffect } from './groupUserEffects'

function makeRow(overrides: Partial<TlaEffectOutbox> = {}): TlaEffectOutbox {
	return {
		id: 1,
		tableName: 'group_user',
		entityId: 'user1',
		command: 'delete',
		payload: { userId: 'user1', groupId: 'group1' } as TlaGroupUser,
		prevPayload: null,
		attempts: 0,
		createdAt: new Date(),
		nextRetryAt: null,
		...overrides,
	}
}

function makeDeps(overrides: Partial<GroupUserEffectDeps> = {}) {
	return {
		isStillMember: vi.fn().mockResolvedValue(false),
		getCandidateFileIds: vi.fn().mockResolvedValue(['file1', 'file2']),
		revokeSessions: vi.fn().mockResolvedValue(undefined),
		reportCapHit: vi.fn(),
		...overrides,
	} satisfies GroupUserEffectDeps
}

describe('processGroupUserEffect', () => {
	it('revokes the removed user on every file they had opened in the group', async () => {
		const deps = makeDeps()
		await processGroupUserEffect(deps, makeRow())

		expect(deps.getCandidateFileIds).toHaveBeenCalledWith('user1', 'group1', MAX_REVOKE_FANOUT + 1)
		expect(vi.mocked(deps.revokeSessions).mock.calls).toEqual([
			['file1', 'user1'],
			['file2', 'user1'],
		])
	})

	// The outbox is at-least-once and drains behind the write, so the membership may have come
	// back between the delete and this run.
	it('does nothing when the user is a member again by the time it drains', async () => {
		const deps = makeDeps({ isStillMember: vi.fn().mockResolvedValue(true) })
		await processGroupUserEffect(deps, makeRow())

		expect(deps.getCandidateFileIds).not.toHaveBeenCalled()
		expect(deps.revokeSessions).not.toHaveBeenCalled()
	})

	it('does nothing when the user had no files open in the group', async () => {
		const deps = makeDeps({ getCandidateFileIds: vi.fn().mockResolvedValue([]) })
		await processGroupUserEffect(deps, makeRow())

		expect(deps.revokeSessions).not.toHaveBeenCalled()
	})

	it.each(['insert', 'update'] as const)('ignores a %s row', async (command) => {
		const deps = makeDeps()
		await processGroupUserEffect(deps, makeRow({ command }))

		expect(deps.isStillMember).not.toHaveBeenCalled()
		expect(deps.revokeSessions).not.toHaveBeenCalled()
	})

	it('caps the fan-out and reports when there are more candidates than the cap', async () => {
		const tooMany = Array.from({ length: MAX_REVOKE_FANOUT + 1 }, (_, i) => `file${i}`)
		const deps = makeDeps({ getCandidateFileIds: vi.fn().mockResolvedValue(tooMany) })
		await processGroupUserEffect(deps, makeRow())

		expect(deps.revokeSessions).toHaveBeenCalledTimes(MAX_REVOKE_FANOUT)
		expect(deps.reportCapHit).toHaveBeenCalledWith('user1', 'group1')
	})

	it('does not report the cap when the candidates exactly fill it', async () => {
		const exactly = Array.from({ length: MAX_REVOKE_FANOUT }, (_, i) => `file${i}`)
		const deps = makeDeps({ getCandidateFileIds: vi.fn().mockResolvedValue(exactly) })
		await processGroupUserEffect(deps, makeRow())

		expect(deps.revokeSessions).toHaveBeenCalledTimes(MAX_REVOKE_FANOUT)
		expect(deps.reportCapHit).not.toHaveBeenCalled()
	})

	// A throw leaves the outbox row queued, so the whole set is retried. Revoking is idempotent.
	it('propagates a revoke failure so the row stays queued', async () => {
		const deps = makeDeps({
			revokeSessions: vi.fn().mockRejectedValue(new Error('room unreachable')),
		})

		await expect(processGroupUserEffect(deps, makeRow())).rejects.toThrow('room unreachable')
	})
})
