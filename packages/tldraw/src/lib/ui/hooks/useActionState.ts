import { useMaybeEditor, useValue } from '@tldraw/editor'
import { TLUiActionItem, useActions } from '../context/actions'

/** @internal */
export function useIsActionEnabled(action: TLUiActionItem | undefined): boolean {
	const editor = useMaybeEditor()
	return useValue(
		'action enabled',
		() => !editor || !action?.isEnabled || action.isEnabled(editor),
		[editor, action]
	)
}

/** @internal */
export function useIsActionChecked(action: TLUiActionItem | undefined): boolean | undefined {
	const editor = useMaybeEditor()
	return useValue('action checked', () => (editor ? action?.isChecked?.(editor) : undefined), [
		editor,
		action,
	])
}

/**
 * Whether any of the given actions would show: it exists, is allowed in readonly mode if the
 * editor is readonly, and is enabled. Use it to hide a submenu whose items would all be hidden;
 * a closed submenu doesn't mount its items, so it can't ask them.
 *
 * @public
 */
export function useSomeActionsEnabled(actionIds: readonly string[]): boolean {
	const editor = useMaybeEditor()
	const actions = useActions()
	const key = actionIds.join('\n')
	return useValue(
		'some actions enabled',
		() =>
			actionIds.some((id) => {
				const action = actions[id]
				if (!action) return false
				if (!editor) return true
				if (editor.getIsReadonly() && !action.readonlyOk) return false
				return !action.isEnabled || action.isEnabled(editor)
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[editor, actions, key]
	)
}
