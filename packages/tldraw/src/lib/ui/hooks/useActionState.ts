import { useComputed, useMaybeEditor, useValue } from '@tldraw/editor'
import { getActionState, TLUiActionState } from '../context/action-state'
import { TLUiActionItem, useActions } from '../context/actions'

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

/**
 * The action's `disabledReason` as a translation key, read only while `active` (the item is
 * disabled and shown in the command palette), so other menus never run it. A throwing reason
 * counts as none.
 *
 * @internal
 */
export function useActionDisabledReason(
	action: TLUiActionItem | undefined,
	active: boolean
): string | undefined {
	const editor = useMaybeEditor()
	return useValue(
		'action disabled reason',
		() => {
			const reason = action?.disabledReason
			if (!active || !editor || !reason) return undefined
			if (typeof reason !== 'function') return reason
			try {
				return reason(editor)
			} catch (error) {
				console.error(`The "${action!.id}" action's disabledReason threw`, error)
				return undefined
			}
		},
		[editor, action, active]
	)
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
