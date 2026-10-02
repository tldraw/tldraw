import { Editor, useComputed, useMaybeEditor, useValue } from '@tldraw/editor'
import { TLUiActionItem, useActions } from '../context/actions'

/** @internal */
export interface TLUiActionState {
	/** False hides the item in every menu except the keyboard shortcuts dialog. */
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
	// These run from always-mounted menus, so a throw would take down the whole editor rather than
	// one menu item. Each predicate falls back on its own, so one throwing can't undo another.
	const visible = tryPredicate(
		action,
		() => isActionVisible(editor, action),
		!editor.getIsReadonly() || !!action.readonlyOk
	)
	return {
		visible,
		enabled: visible && tryPredicate(action, () => isActionEnabled(editor, action), false),
		checked: tryPredicate(action, () => action.isChecked?.(editor), undefined),
	}
}

function tryPredicate<T>(action: TLUiActionItem, run: () => T, fallback: T): T {
	try {
		return run()
	} catch (error) {
		reportThrowingAction(action, error)
		return fallback
	}
}

const reportedActions = new Set<string>()

function reportThrowingAction(action: TLUiActionItem, error: unknown) {
	if (reportedActions.has(action.id)) return
	reportedActions.add(action.id)
	console.error(`The "${action.id}" action's isAvailable, isEnabled or isChecked threw`, error)
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
 * Whether any of the given actions is available and enabled. Unknown ids, unavailable actions,
 * and actions that aren't `readonlyOk` while the editor is readonly count as not enabled. Use it to
 * hide a submenu when none of its items can run; a closed submenu doesn't mount its items, so it
 * can't ask them.
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
