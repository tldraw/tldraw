import { useComputed, useValue } from '@tldraw/state'
import { uniq } from '../utils/uniq'
import { useEditor } from './useEditor'

// TODO: maybe move this to a computed property on the App class?
/**
 * @returns The list of peer UserIDs
 * @internal
 */
export function usePeerIds() {
	const editor = useEditor()

	const $userIds = useComputed(
		'userIds',
		() => uniq(editor.getCollaborators().map((p) => p.userId)).sort(),
		{ isEqual: (a, b) => a.join(',') === b.join?.(',') },
		[editor]
	)

	return useValue($userIds)
}
