import type { Editor, TLShape } from '@tldraw/editor'
import type { TLUiToolItem } from '../hooks/useTools'
import { canCreateShapeOfType } from './action-predicates'
import type { TLUiActionItem } from './actions'

/** @internal */
export interface TLUiActionState {
	/** False hides the item in every menu except the keyboard shortcuts dialog. */
	available: boolean
	enabled: boolean
	checked: boolean | undefined
}

const MISSING: TLUiActionState = { available: false, enabled: false, checked: undefined }
const NO_EDITOR: TLUiActionState = { available: true, enabled: true, checked: undefined }

/** @internal */
export function isReadonlyOk(
	editor: Editor,
	readonlyOk: boolean | ((editor: Editor) => boolean) | undefined
) {
	if (typeof readonlyOk !== 'function') return !!readonlyOk
	try {
		return readonlyOk(editor)
	} catch (error) {
		console.error('A readonlyOk check threw, so the item is hidden while readonly', error)
		return false
	}
}

/**
 * Whether a tool shows and runs now: in readonly mode only when it is `readonlyOk`, and a tool
 * that creates shapes only when the `canWrite` editor option lets this person create that shape
 * on the current page. A tool creates the shape type it is named after, the geo tools (such as
 * `rectangle`) create geo shapes, and the media tool creates images.
 *
 * @internal
 */
export function isToolAvailable(editor: Editor, tool: TLUiToolItem) {
	if (editor.getIsReadonly() && !isReadonlyOk(editor, tool.readonlyOk)) return false
	const type = tool.meta?.geo ? 'geo' : tool.id === 'asset' ? 'image' : tool.id
	return canCreateShapeOfType(editor, type as TLShape['type'])
}

function isActionAvailable(editor: Editor, action: TLUiActionItem) {
	if (editor.getIsReadonly() && !isReadonlyOk(editor, action.readonlyOk)) return false
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
	return readActionState(editor, action)
}

function readActionState(editor: Editor, action: TLUiActionItem): TLUiActionState {
	// These run from always-mounted menus, so a throw would take down the whole editor rather than
	// one menu item. A throw disables the item instead; it stays visible unless readonly hides it.
	let threw = false
	function tryPredicate<T>(name: string, run: () => T, fallback: T): T {
		try {
			return run()
		} catch (error) {
			threw = true
			reportThrowingPredicate(editor, action, name, error)
			return fallback
		}
	}
	const available = tryPredicate(
		'isAvailable',
		() => isActionAvailable(editor, action),
		!editor.getIsReadonly() || isReadonlyOk(editor, action.readonlyOk)
	)
	const enabled =
		available && tryPredicate('isEnabled', () => isActionEnabled(editor, action), false)
	const checked = tryPredicate('isChecked', () => action.isChecked?.(editor), undefined)
	return { available, enabled: enabled && !threw, checked }
}

const reportedPredicates = new WeakMap<Editor, Set<string>>()

function reportThrowingPredicate(
	editor: Editor,
	action: TLUiActionItem,
	name: string,
	error: unknown
) {
	const key = `${action.id}:${name}`
	let reported = reportedPredicates.get(editor)
	if (!reported) reportedPredicates.set(editor, (reported = new Set()))
	if (reported.has(key)) return
	reported.add(key)
	console.error(`The "${action.id}" action's ${name} threw`, error)
}

/**
 * Whether an action may run now. A throwing `isAvailable` or `isEnabled` blocks it. `isChecked`
 * doesn't, though a menu item whose `isChecked` throws shows as disabled.
 *
 * @internal
 */
export function isActionRunnable(editor: Editor, action: TLUiActionItem | undefined): boolean {
	if (!action) return false
	if (editor.getIsReadonly() && !isReadonlyOk(editor, action.readonlyOk)) return false
	return passes(editor, action, 'isAvailable') && passes(editor, action, 'isEnabled')
}

function passes(editor: Editor, action: TLUiActionItem, name: 'isAvailable' | 'isEnabled') {
	try {
		return !action[name] || action[name](editor)
	} catch (error) {
		reportThrowingPredicate(editor, action, name, error)
		return false
	}
}
