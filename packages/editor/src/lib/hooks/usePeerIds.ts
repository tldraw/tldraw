import { useComputed, useValue } from '@tldraw/state-react'
import { uniq } from '../utils/uniq'
import { useEditor } from './useEditor'

/**
 * Reactive list of peer user IDs for collaborators currently shown in the UI.
 * Mirrors {@link Editor.getVisibleCollaborators} — peers fade out as they
 * transition to idle/inactive, without requiring a manual re-render.
 *
 * @returns The list of peer UserIDs
 * @public
 */
export function usePeerIds() {
	const editor = useEditor()

	const $userIds = useComputed(
		'userIds',
		() => uniq(editor.getVisibleCollaborators().map((p) => p.userId)).sort(),
		{ isEqual: (a, b) => a.join(',') === b.join?.(',') },
		[editor]
	)

	return useValue($userIds)
}
