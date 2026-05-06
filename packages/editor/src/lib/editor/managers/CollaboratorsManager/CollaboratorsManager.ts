import { EMPTY_ARRAY, atom, computed } from '@tldraw/state'
import { TLInstancePresence } from '@tldraw/tlschema'
import { maxBy } from '@tldraw/utils'
import {
	getCollaboratorStateFromElapsedTime,
	shouldShowCollaborator,
} from '../../../utils/collaboratorState'
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
	constructor(private readonly editor: Editor) {
		// Editor disposes `editor.timers` on its own teardown, so the interval is
		// automatically cleared when the editor is disposed.
		editor.timers.setInterval(() => {
			this._visibilityClock.set(Date.now())
		}, editor.options.collaboratorCheckIntervalMs)
	}

	/**
	 * Drives reactive re-evaluation of {@link CollaboratorsManager.getVisibleCollaborators}.
	 * Ticked on a fixed interval so callers don't need to manage their own activity timers.
	 */
	private readonly _visibilityClock = atom('collaboratorVisibilityClock', Date.now())

	@computed
	private _getCollaboratorsQuery() {
		return this.editor.store.query.records('instance_presence', () => ({
			userId: { neq: this.editor.user.getId() },
		}))
	}

	/**
	 * Returns a list of presence records for all peer collaborators.
	 * This will return the latest presence record for each connected user.
	 */
	@computed
	getCollaborators(): TLInstancePresence[] {
		const allPresenceRecords = this._getCollaboratorsQuery().get()
		if (!allPresenceRecords.length) return EMPTY_ARRAY
		const userIds = [...new Set(allPresenceRecords.map((c) => c.userId))].sort()
		return userIds.map((id) => {
			const latestPresence = maxBy(
				allPresenceRecords.filter((c) => c.userId === id),
				(p) => p.lastActivityTimestamp ?? 0
			)
			return latestPresence!
		})
	}

	/**
	 * Returns a list of presence records for all peer collaborators on the current page.
	 * This will return the latest presence record for each connected user.
	 */
	@computed
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
	@computed
	getVisibleCollaborators(): TLInstancePresence[] {
		this._visibilityClock.get()
		const now = Date.now()
		return this.getCollaborators().filter((presence) => {
			// Treat a missing `lastActivityTimestamp` as "active right now" (elapsed = 0)
			// so newly-joined peers aren't immediately classified as idle/inactive.
			const elapsed = Math.max(0, now - (presence.lastActivityTimestamp ?? now))
			const state = getCollaboratorStateFromElapsedTime(this.editor, elapsed)
			return shouldShowCollaborator(this.editor, presence, state)
		})
	}

	/**
	 * Returns a list of presence records for peer collaborators who should currently be
	 * shown in the UI, filtered to those on the current page.
	 */
	@computed
	getVisibleCollaboratorsOnCurrentPage(): TLInstancePresence[] {
		const currentPageId = this.editor.getCurrentPageId()
		return this.getVisibleCollaborators().filter((c) => c.currentPageId === currentPageId)
	}
}
