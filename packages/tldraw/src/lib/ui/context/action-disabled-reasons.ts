import { Editor } from '@tldraw/editor'
import { TLUiTranslationKey } from '../hooks/useTranslation/TLUiTranslationKey'
import {
	areAllSelectedFrameLike,
	hasUnlockedSelection,
	isOnlyTextSelected,
} from './action-predicates'

// Why each built-in action is disabled, for the command palette to show while it can't run. Kept
// beside the actions rather than on them: `isEnabled` stays the only gate, and these only explain
// it. A reason re-checks some of what `isEnabled` checks, so when you change an action's gate,
// update its reason here too. Reads happen only while the action is disabled.

/** A reason key, or one chosen from the editor's state. @internal */
export type TLUiActionDisabledReason =
	| TLUiTranslationKey
	| ((editor: Editor) => TLUiTranslationKey | undefined)

// Selection survives tool switches, so "select shapes, press D, open the palette, align" is real:
// outside the select tool the selection is fine and the tool is what's missing.
const inSelectTool =
	(reason: TLUiTranslationKey | ((editor: Editor) => TLUiTranslationKey)) =>
	(editor: Editor): TLUiTranslationKey =>
		!editor.isIn('select')
			? 'command-palette.reason.select-tool'
			: typeof reason === 'function'
				? reason(editor)
				: reason

const SELECT_SHAPES = {
	1: inSelectTool('command-palette.reason.select-shape'),
	2: inSelectTool('command-palette.reason.select-2-shapes'),
	3: inSelectTool('command-palette.reason.select-3-shapes'),
}
const PAGE_EMPTY = 'command-palette.reason.page-empty'

const DISABLED_REASONS: Record<string, TLUiActionDisabledReason> = {
	delete: SELECT_SHAPES[1],
	duplicate: SELECT_SHAPES[1],
	copy: SELECT_SHAPES[1],
	cut: SELECT_SHAPES[1],
	'toggle-lock': SELECT_SHAPES[1],
	'select-none': SELECT_SHAPES[1],
	'zoom-to-selection': SELECT_SHAPES[1],
	'frame-selection': SELECT_SHAPES[1],
	'flatten-to-image': (editor) =>
		editor.getSelectedShapeIds().length > 0
			? 'command-palette.reason.already-image'
			: 'command-palette.reason.select-shape',
	'bring-to-front': SELECT_SHAPES[1],
	'bring-forward': SELECT_SHAPES[1],
	'send-backward': SELECT_SHAPES[1],
	'send-to-back': SELECT_SHAPES[1],
	'rotate-cw': SELECT_SHAPES[1],
	'rotate-ccw': SELECT_SHAPES[1],
	'align-left': SELECT_SHAPES[2],
	'align-center-horizontal': SELECT_SHAPES[2],
	'align-right': SELECT_SHAPES[2],
	'align-top': SELECT_SHAPES[2],
	'align-center-vertical': SELECT_SHAPES[2],
	'align-bottom': SELECT_SHAPES[2],
	'stretch-horizontal': SELECT_SHAPES[2],
	'stretch-vertical': SELECT_SHAPES[2],
	pack: SELECT_SHAPES[2],
	'distribute-horizontal': SELECT_SHAPES[3],
	'distribute-vertical': SELECT_SHAPES[3],
	group: inSelectTool((editor) =>
		hasUnlockedSelection(editor, 2)
			? 'command-palette.reason.group-bound-arrow'
			: 'command-palette.reason.select-2-shapes'
	),
	ungroup: inSelectTool('command-palette.reason.select-group'),
	'remove-frame': inSelectTool('command-palette.reason.select-frame'),
	'fit-frame-to-content': inSelectTool((editor) =>
		editor.getSelectedShapes().length === 1 && areAllSelectedFrameLike(editor)
			? 'command-palette.reason.frame-empty'
			: 'command-palette.reason.select-frame'
	),
	'edit-link': inSelectTool('command-palette.reason.select-link-shape'),
	'convert-to-embed': inSelectTool('command-palette.reason.select-bookmark'),
	'convert-to-bookmark': inSelectTool('command-palette.reason.select-embed'),
	'toggle-auto-size': inSelectTool((editor) =>
		isOnlyTextSelected(editor)
			? 'command-palette.reason.auto-size-on'
			: 'command-palette.reason.select-text'
	),
	'download-original': 'command-palette.reason.select-media',
	'flip-horizontal': inSelectTool((editor) =>
		hasUnlockedSelection(editor, 1)
			? 'command-palette.reason.cant-flip'
			: 'command-palette.reason.select-shape'
	),
	'flip-vertical': inSelectTool((editor) =>
		hasUnlockedSelection(editor, 1)
			? 'command-palette.reason.cant-flip'
			: 'command-palette.reason.select-shape'
	),
	'stack-horizontal': inSelectTool((editor) =>
		hasUnlockedSelection(editor, 3)
			? 'command-palette.reason.select-3-stackable'
			: 'command-palette.reason.select-3-shapes'
	),
	'stack-vertical': inSelectTool((editor) =>
		hasUnlockedSelection(editor, 3)
			? 'command-palette.reason.select-3-stackable'
			: 'command-palette.reason.select-3-shapes'
	),
	undo: 'command-palette.reason.nothing-to-undo',
	redo: 'command-palette.reason.nothing-to-redo',
	'select-all': PAGE_EMPTY,
	'unlock-all': 'command-palette.reason.nothing-locked',
	'zoom-to-fit': PAGE_EMPTY,
	'zoom-to-100': 'command-palette.reason.zoom-100',
	'export-as-svg': PAGE_EMPTY,
	'export-as-png': PAGE_EMPTY,
	'copy-as-svg': PAGE_EMPTY,
	'copy-as-png': PAGE_EMPTY,
	'copy-as-json': PAGE_EMPTY,
	print: PAGE_EMPTY,
	'toggle-invert-zoom': 'command-palette.reason.mouse-input-only',
	'move-to-new-page': (editor) =>
		hasUnlockedSelection(editor, 1)
			? 'page-menu.max-pages-reached'
			: 'command-palette.reason.select-shape',
}

/** Why a built-in action is disabled, if it says. @internal */
export function getActionDisabledReason(actionId: string): TLUiActionDisabledReason | undefined {
	return Object.hasOwn(DISABLED_REASONS, actionId) ? DISABLED_REASONS[actionId] : undefined
}
