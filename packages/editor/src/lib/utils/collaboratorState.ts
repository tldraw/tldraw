import type { TLInstancePresence } from '@tldraw/tlschema'
import type { Editor } from '../editor/Editor'

/** The activity state of a collaborator */
export type CollaboratorState = 'active' | 'idle' | 'inactive'

interface CollaboratorVisibilityOptions {
	followingUserId: string | null
	highlightedUserIds: readonly string[]
	currentUserId: string
}

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
 * and the relevant current user state (following, highlighted users, etc.).
 *
 * @param presence - The collaborator's presence data
 * @param state - The collaborator's activity state
 * @param visibility - The current visibility state
 * @returns Whether the collaborator should be shown
 */
export function shouldShowCollaborator(
	presence: TLInstancePresence,
	state: CollaboratorState,
	{ followingUserId, highlightedUserIds, currentUserId }: CollaboratorVisibilityOptions
): boolean {
	switch (state) {
		case 'inactive':
			// If they're inactive, only show if we're following them or they're highlighted
			return followingUserId === presence.userId || highlightedUserIds.includes(presence.userId)
		case 'idle':
			// If they're idle and following us, hide them unless they have a chat message or are highlighted
			if (presence.followingUserId === currentUserId) {
				return !!(presence.chatMessage || highlightedUserIds.includes(presence.userId))
			}
			return true
		case 'active':
			return true
	}
}
