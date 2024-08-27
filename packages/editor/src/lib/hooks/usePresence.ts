import { useValue } from '@tldraw/state-react'
import { TLInstancePresence } from '@tldraw/tlschema'
import { useEditor } from './useEditor'

// TODO: maybe move this to a computed property on the App class?
/**
 * @returns The list of peer UserIDs
 * @internal
 */
export function usePresence(userId: string): TLInstancePresence | null {
	const editor = useEditor()

	const latestPresence = useValue(
		`latestPresence:${userId}`,
		() => {
			return editor.getCollaborators().find((c) => c.userId === userId)
		},
		[editor, userId]
	)

	return latestPresence ?? null
}
