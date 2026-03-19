import { useValue } from '@tldraw/state-react'
import type { TLPermissionContext } from '@tldraw/tlschema'
import { useEditor } from './useEditor'

/**
 * Returns whether the current user can perform the given activity, re-rendering
 * when the result changes. Safe to call in render paths — no callbacks fire.
 * Returns `true` when no permissions config is active.
 *
 * @public
 */
export function useCanPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean {
	const editor = useEditor()
	return useValue('canPerform', () => editor.permissions?.canPerform(activityId, context) ?? true, [
		editor,
		activityId,
		context,
	])
}
