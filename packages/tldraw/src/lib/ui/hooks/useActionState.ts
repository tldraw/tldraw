import { Editor, useComputed, useMaybeEditor, useValue } from '@tldraw/editor'
import { TLUiActionItem, useActions } from '../context/actions'

/** @internal */
export interface TLUiActionState {
	/** False hides the item on every surface. */
	visible: boolean
	enabled: boolean
	checked: boolean | undefined
}

const MISSING: TLUiActionState = { visible: false, enabled: false, checked: undefined }
const NO_EDITOR: TLUiActionState = { visible: true, enabled: true, checked: undefined }

function isActionVisible(editor: Editor, action: TLUiActionItem) {
	if (editor.getIsReadonly() && !action.readonlyOk) return false
	return !action.isAvailable || action.isAvailable(editor)
}

function isActionEnabled(editor: Editor, action: TLUiActionItem) {
	return !action.isEnabled || action.isEnabled(editor)
}

/** @internal */
export function getActionState(
	editor: Editor | null,
	action: TLUiActionItem | undefined
): TLUiActionState {
	if (!action) return MISSING
	if (!editor) return NO_EDITOR
	const visible = isActionVisible(editor, action)
	return {
		visible,
		enabled: visible && isActionEnabled(editor, action),
		checked: action.isChecked?.(editor),
	}
}

function isSameState(a: TLUiActionState, b: TLUiActionState) {
	return a.visible === b.visible && a.enabled === b.enabled && a.checked === b.checked
}

/**
 * The one place menus read an action's visibility, enablement and checked state from.
 *
 * @internal
 */
export function useActionState(action: TLUiActionItem | undefined): TLUiActionState {
	const editor = useMaybeEditor()
	const $state = useComputed(
		'action state',
		() => getActionState(editor, action),
		{ isEqual: isSameState },
		[editor, action]
	)
	return useValue($state)
}

function useSomeActions(
	name: string,
	actionIds: readonly string[],
	test: (state: TLUiActionState) => boolean
) {
	const editor = useMaybeEditor()
	const actions = useActions()
	const key = actionIds.join('\n')
	return useValue(
		name,
		() => actionIds.some((id) => test(getActionState(editor, actions[id]))),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[editor, actions, key]
	)
}

/**
 * Whether any of the given actions would show and be enabled. Unknown ids, and actions that
 * aren't `readonlyOk` while the editor is readonly, count as not shown. Use it to hide a submenu
 * whose items would all be hidden; a closed submenu doesn't mount its items, so it can't ask them.
 *
 * @public
 */
export function useSomeActionsEnabled(actionIds: readonly string[]): boolean {
	return useSomeActions('some actions enabled', actionIds, (state) => state.enabled)
}

/**
 * Like {@link useSomeActionsEnabled}, but for a submenu that shows disabled items: true when any
 * of the actions would show at all.
 *
 * @internal
 */
export function useSomeActionsVisible(actionIds: readonly string[]): boolean {
	return useSomeActions('some actions visible', actionIds, (state) => state.visible)
}
