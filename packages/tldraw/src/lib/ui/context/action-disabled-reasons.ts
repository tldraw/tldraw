import { defineMessages, Editor } from '@tldraw/editor'
import { TLUiTranslationKey } from '../hooks/useTranslation/TLUiTranslationKey'
import {
	areAllSelectedFrameLike,
	hasUnlockedSelection,
	isOnlyTextSelected,
} from './action-predicates'

const messages = defineMessages({
	alreadyImage: {
		id: 'command-palette.reason.already-image',
		defaultMessage: 'This is already an image',
	},
	autoSizeOn: {
		id: 'command-palette.reason.auto-size-on',
		defaultMessage: 'This text already sizes to fit',
	},
	cantFlip: {
		id: 'command-palette.reason.cant-flip',
		defaultMessage: "This shape can't be flipped",
	},
	frameEmpty: { id: 'command-palette.reason.frame-empty', defaultMessage: 'This frame is empty' },
	groupBoundArrow: {
		id: 'command-palette.reason.group-bound-arrow',
		defaultMessage: 'Also select the shapes the arrows connect',
	},
	mouseInputOnly: {
		id: 'command-palette.reason.mouse-input-only',
		defaultMessage: 'Only with mouse input',
	},
	nothingLocked: {
		id: 'command-palette.reason.nothing-locked',
		defaultMessage: 'Nothing is locked',
	},
	nothingToRedo: {
		id: 'command-palette.reason.nothing-to-redo',
		defaultMessage: 'Nothing to redo',
	},
	nothingToUndo: {
		id: 'command-palette.reason.nothing-to-undo',
		defaultMessage: 'Nothing to undo',
	},
	pageEmpty: { id: 'command-palette.reason.page-empty', defaultMessage: 'This page is empty' },
	select2Shapes: {
		id: 'command-palette.reason.select-2-shapes',
		defaultMessage: 'Select at least 2 shapes',
	},
	select3Shapes: {
		id: 'command-palette.reason.select-3-shapes',
		defaultMessage: 'Select at least 3 shapes',
	},
	select3Stackable: {
		id: 'command-palette.reason.select-3-stackable',
		defaultMessage: 'Select 3 shapes other than connected arrows',
	},
	selectBookmark: {
		id: 'command-palette.reason.select-bookmark',
		defaultMessage: 'Select a bookmark first',
	},
	selectEmbed: {
		id: 'command-palette.reason.select-embed',
		defaultMessage: 'Select an embed first',
	},
	selectFrame: {
		id: 'command-palette.reason.select-frame',
		defaultMessage: 'Select a frame first',
	},
	selectGroup: {
		id: 'command-palette.reason.select-group',
		defaultMessage: 'Select a group first',
	},
	selectLinkShape: {
		id: 'command-palette.reason.select-link-shape',
		defaultMessage: 'Select one linkable shape first',
	},
	selectMedia: {
		id: 'command-palette.reason.select-media',
		defaultMessage: 'Select an image or video first',
	},
	selectShape: {
		id: 'command-palette.reason.select-shape',
		defaultMessage: 'Select a shape first',
	},
	selectText: {
		id: 'command-palette.reason.select-text',
		defaultMessage: 'Select a text shape first',
	},
	selectTool: {
		id: 'command-palette.reason.select-tool',
		defaultMessage: 'Switch to the select tool first',
	},
	zoom100: { id: 'command-palette.reason.zoom-100', defaultMessage: 'Already at 100%' },
	maxPagesReached: { id: 'page-menu.max-pages-reached', defaultMessage: 'Maximum pages reached' },
})

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
			? messages.selectTool.id
			: typeof reason === 'function'
				? reason(editor)
				: reason

const SELECT_SHAPES = {
	1: inSelectTool(messages.selectShape.id),
	2: inSelectTool(messages.select2Shapes.id),
	3: inSelectTool(messages.select3Shapes.id),
}
const PAGE_EMPTY = messages.pageEmpty.id

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
		editor.getSelectedShapeIds().length > 0 ? messages.alreadyImage.id : messages.selectShape.id,
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
		hasUnlockedSelection(editor, 2) ? messages.groupBoundArrow.id : messages.select2Shapes.id
	),
	ungroup: inSelectTool(messages.selectGroup.id),
	'remove-frame': inSelectTool(messages.selectFrame.id),
	'fit-frame-to-content': inSelectTool((editor) =>
		editor.getSelectedShapes().length === 1 && areAllSelectedFrameLike(editor)
			? messages.frameEmpty.id
			: messages.selectFrame.id
	),
	'edit-link': inSelectTool(messages.selectLinkShape.id),
	'convert-to-embed': inSelectTool(messages.selectBookmark.id),
	'convert-to-bookmark': inSelectTool(messages.selectEmbed.id),
	'toggle-auto-size': inSelectTool((editor) =>
		isOnlyTextSelected(editor) ? messages.autoSizeOn.id : messages.selectText.id
	),
	'download-original': messages.selectMedia.id,
	'flip-horizontal': inSelectTool((editor) =>
		hasUnlockedSelection(editor, 1) ? messages.cantFlip.id : messages.selectShape.id
	),
	'flip-vertical': inSelectTool((editor) =>
		hasUnlockedSelection(editor, 1) ? messages.cantFlip.id : messages.selectShape.id
	),
	'stack-horizontal': inSelectTool((editor) =>
		hasUnlockedSelection(editor, 3) ? messages.select3Stackable.id : messages.select3Shapes.id
	),
	'stack-vertical': inSelectTool((editor) =>
		hasUnlockedSelection(editor, 3) ? messages.select3Stackable.id : messages.select3Shapes.id
	),
	undo: messages.nothingToUndo.id,
	redo: messages.nothingToRedo.id,
	'select-all': PAGE_EMPTY,
	'unlock-all': messages.nothingLocked.id,
	'zoom-to-fit': PAGE_EMPTY,
	'zoom-to-100': messages.zoom100.id,
	'export-as-svg': PAGE_EMPTY,
	'export-as-png': PAGE_EMPTY,
	'copy-as-svg': PAGE_EMPTY,
	'copy-as-png': PAGE_EMPTY,
	'copy-as-json': PAGE_EMPTY,
	print: PAGE_EMPTY,
	'toggle-invert-zoom': messages.mouseInputOnly.id,
	'move-to-new-page': (editor) =>
		hasUnlockedSelection(editor, 1) ? messages.maxPagesReached.id : messages.selectShape.id,
}

/** Why a built-in action is disabled, if it says. @internal */
export function getActionDisabledReason(actionId: string): TLUiActionDisabledReason | undefined {
	return Object.hasOwn(DISABLED_REASONS, actionId) ? DISABLED_REASONS[actionId] : undefined
}
