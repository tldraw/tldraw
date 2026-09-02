import { EMPTY_ARRAY, atom, computed } from '@tldraw/state'
import type { TLInstancePresence } from '@tldraw/tlschema'
import { areArraysShallowEqual } from '@tldraw/utils'
import type { Editor } from '../../Editor'

/**
 * Tracks remote peers and exposes the collaborator-related queries used by the
 * editor and its overlays. Encapsulates the visibility clock that periodically
 * re-evaluates which collaborators should be visible based on activity.
 *
 * Accessed via {@link Editor.collaborators}.
 *
 * @public
 */
export class CollaboratorsManager {
	constructor(private readonly editor: Editor) {}

	private _visibilityClockStarted = false

	private _startVisibilityClock() {
		if (this._visibilityClockStarted) return
		this._visibilityClockStarted = true

		// Editor disposes `editor.timers` on its own teardown, so the interval is
		// automatically cleared when the editor is disposed.
		this.editor.timers.setInterval(() => {
			this._visibilityClock.set(Date.now())
		}, this.editor.options.collaboratorCheckIntervalMs)
	}

	/**
	 * Drives reactive re-evaluation of {@link CollaboratorsManager.getVisibleCollaborators}.
	 * Ticked on a fixed interval so callers don't need to manage their own activity timers.
	 */
	private readonly _visibilityClock = atom('collaboratorVisibilityClock', Date.now())

	@computed
	private _getCollaboratorsQuery() {
		return this.editor.store.query.records('instance_presence', () => ({
			userId: { neq: this.editor.user.getRecordId() },
		}))
	}

	// These queries all derive fresh arrays with map/filter, so they compare results with
	// shallow (element-identity) equality: a presence update that leaves a derived list's
	// elements unchanged — e.g. a peer moving on another page — keeps the previous array's
	// identity and doesn't invalidate downstream subscribers such as the cursor layer.

	/**
	 * Returns a list of presence records for all peer collaborators.
	 * This will return the latest presence record for each connected user.
	 */
	@computed({ isEqual: areArraysShallowEqual })
	getCollaborators(): TLInstancePresence[] {
		const allPresenceRecords = this._getCollaboratorsQuery().get()
		if (!allPresenceRecords.length) return EMPTY_ARRAY
		const latestByUserId = new Map<string, TLInstancePresence>()
		for (const presence of allPresenceRecords) {
			const latest = latestByUserId.get(presence.userId)
			if (!latest || (presence.lastActivityTimestamp ?? 0) > (latest.lastActivityTimestamp ?? 0)) {
				latestByUserId.set(presence.userId, presence)
			}
		}
		return [...latestByUserId.keys()].sort().map((id) => latestByUserId.get(id)!)
	}

	/**
	 * Returns a list of presence records for all peer collaborators on the current page.
	 * This will return the latest presence record for each connected user.
	 */
	@computed({ isEqual: areArraysShallowEqual })
	getCollaboratorsOnCurrentPage(): TLInstancePresence[] {
		const currentPageId = this.editor.getCurrentPageId()
		return this.getCollaborators().filter((c) => c.currentPageId === currentPageId)
	}

	/**
	 * Returns a list of presence records for peer collaborators who should currently be
	 * shown in the UI. Filters {@link CollaboratorsManager.getCollaborators} by activity
	 * state (active / idle / inactive) and visibility rules such as following and
	 * highlighted users. Re-evaluates on the visibility clock, so callers don't need to
	 * drive their own activity timer.
	 */
	@computed({ isEqual: areArraysShallowEqual })
	getVisibleCollaborators(): TLInstancePresence[] {
		const { editor } = this
		const { collaboratorInactiveTimeoutMs, collaboratorIdleTimeoutMs } = editor.options

		this._startVisibilityClock()
		this._visibilityClock.get()
		const now = Date.now()
		const collaborators = this.getCollaborators()
		if (!collaborators.length) return EMPTY_ARRAY

		const { followingUserId, highlightedUserIds } = this.editor.getInstanceState()
		const currentUserId = this.editor.user.getRecordId()

		return collaborators.filter((presence) => {
			const { lastActivityTimestamp, userId, chatMessage } = presence

			// Treat a missing or zero `lastActivityTimestamp` as "active right now"
			// (elapsed = 0) so newly-joined peers aren't immediately classified as
			// idle/inactive. The broadcast default for peers who haven't moved their
			// pointer yet is `0` (e.g. someone on a touch device who joins and just
			// watches), so a plain `?? now` would leave them hidden. See issue #9017.
			const elapsed = lastActivityTimestamp ? Math.max(0, now - lastActivityTimestamp) : 0

			if (elapsed > collaboratorInactiveTimeoutMs) {
				// Inactive: If they're inactive, only show if we're following them or they're highlighted
				return followingUserId === userId || highlightedUserIds.includes(userId)
			}

			if (elapsed > collaboratorIdleTimeoutMs) {
				// Idle: If they're idle and following us, hide them unless they have a chat message or are highlighted
				if (presence.followingUserId === currentUserId) {
					return !!(chatMessage || highlightedUserIds.includes(userId))
				}
			}

			// Active
			return true
		})
	}

	/**
	 * Returns a list of presence records for peer collaborators who should currently be
	 * shown in the UI, filtered to those on the current page.
	 */
	@computed({ isEqual: areArraysShallowEqual })
	getVisibleCollaboratorsOnCurrentPage(): TLInstancePresence[] {
		const currentPageId = this.editor.getCurrentPageId()
		return this.getVisibleCollaborators().filter((c) => c.currentPageId === currentPageId)
	}
}
