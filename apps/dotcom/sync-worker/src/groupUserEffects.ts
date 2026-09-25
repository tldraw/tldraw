import { TlaEffectOutbox, TlaGroupUser } from '@tldraw/dotcom-shared'

// An effect_outbox row whose tableName is 'group_user'. Only deletes are written (migration 051).
export interface GroupUserEffectRow extends TlaEffectOutbox {
	payload: TlaGroupUser
}

/**
 * How many of the removed user's files in the group to visit. A live session implies a file_state
 * row, but file_state accumulates for every file ever opened, so the candidate list is ordered
 * most-recently-visited first and cut here. Overrunning this would mean one person had opened more
 * than a thousand of the workspace's files and still had a socket on the oldest of them.
 */
export const MAX_REVOKE_FANOUT = 1000

export interface GroupUserEffectDeps {
	/** Whether the user is a member of the group *now* — they may have been re-added since. */
	isStillMember(userId: string, groupId: string): Promise<boolean>
	/** Files in the group this user has opened, most recently visited first. */
	getCandidateFileIds(userId: string, groupId: string, limit: number): Promise<string[]>
	/** Ask one file's room to re-check this user and close their sessions if access is gone. */
	revokeSessions(fileId: string, userId: string): Promise<void>
	reportCapHit(userId: string, groupId: string): void
}

export async function processGroupUserEffect(
	deps: GroupUserEffectDeps,
	genericRow: TlaEffectOutbox
) {
	// Invariant: caller must route only tableName === 'group_user' rows here.
	const row = genericRow as GroupUserEffectRow
	if (row.command !== 'delete') return
	const { userId, groupId } = row.payload

	// Staleness guard, as in processFileEffect: act on present truth and treat the row as a
	// wake-up signal. Re-adding someone between the delete and this drain must not kick them.
	if (await deps.isStillMember(userId, groupId)) return

	// One extra so hitting the cap is distinguishable from exactly filling it.
	const candidates = await deps.getCandidateFileIds(userId, groupId, MAX_REVOKE_FANOUT + 1)
	if (candidates.length > MAX_REVOKE_FANOUT) {
		deps.reportCapHit(userId, groupId)
		candidates.length = MAX_REVOKE_FANOUT
	}

	// Sequential on purpose. Removals are rare and every cold room returns without loading
	// anything, so this trades latency for not opening a thousand concurrent DO connections.
	// A throw propagates: the outbox row stays queued and the whole set is retried, which is
	// safe because revoking is idempotent.
	for (const fileId of candidates) {
		await deps.revokeSessions(fileId, userId)
	}
}
