import { TLInstancePresence } from '@tldraw/tlschema'
import { Editor } from '../editor/Editor'

/** The activity state of a collaborator */
export type CollaboratorState = 'active' | 'idle' | 'inactive'

/**
 * Get the activity state of a collaborator based on elapsed time since their last activity.
 *
 * @param editor - The editor instance
 * @param elapsed - Time in milliseconds since the collaborator's last activity
 * @returns The collaborator's activity state
 */
export function getCollaboratorStateFromElapsedTime(
	editor: Editor,
	elapsed: number
): CollaboratorState {
	return elapsed > editor.options.collaboratorInactiveTimeoutMs
		? 'inactive'
		: elapsed > editor.options.collaboratorIdleTimeoutMs
			? 'idle'
			: 'active'
}

/**
 * Determine whether a collaborator should be shown based on their activity state
 * and the current instance state (following, highlighted users, etc.).
 *
 * @param editor - The editor instance
 * @param presence - The collaborator's presence data
 * @param state - The collaborator's activity state
 * @returns Whether the collaborator should be shown
 */
export function shouldShowCollaborator(
	editor: Editor,
	presence: TLInstancePresence,
	state: CollaboratorState
): boolean {
	const { followingUserId, highlightedUserIds } = editor.getInstanceState()

	switch (state) {
		case 'inactive':
			// If they're inactive, only show if we're following them or they're highlighted
			return followingUserId === presence.userId || highlightedUserIds.includes(presence.userId)
		case 'idle':
			// If they're idle and following us, hide them unless they have a chat message or are highlighted
			if (presence.followingUserId === editor.user.getId()) {
				return !!(presence.chatMessage || highlightedUserIds.includes(presence.userId))
			}
			return true
		case 'active':
			return true
	}
}
