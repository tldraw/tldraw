import { Editor } from '@tldraw/editor'
import { TLUiTranslationKey } from '../hooks/useTranslation/TLUiTranslationKey'
import { areAllSelectedFrameLike, hasUnlockedSelection } from './action-predicates'
import type { TLUiActionItem } from './actions'

type Reason = TLUiActionItem<TLUiTranslationKey>['disabledReason']

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

const PALETTE_GROUPS: Record<string, readonly string[]> = {
	selection: [
		'delete',
		'duplicate',
		'copy',
		'cut',
		'toggle-lock',
		'group',
		'ungroup',
		'frame-selection',
		'flatten-to-image',
		'remove-frame',
		'fit-frame-to-content',
		'edit-link',
		'convert-to-embed',
		'convert-to-bookmark',
		'toggle-auto-size',
		'download-original',
		'select-none',
		'zoom-to-selection',
	],
	arrange: [
		'bring-to-front',
		'bring-forward',
		'send-backward',
		'send-to-back',
		'rotate-cw',
		'rotate-ccw',
		'align-left',
		'align-center-horizontal',
		'align-right',
		'align-top',
		'align-center-vertical',
		'align-bottom',
		'stretch-horizontal',
		'stretch-vertical',
		'pack',
		'distribute-horizontal',
		'distribute-vertical',
		'flip-horizontal',
		'flip-vertical',
		'stack-horizontal',
		'stack-vertical',
	],
	edit: ['undo', 'redo', 'paste', 'select-all', 'insert-media', 'insert-embed', 'unlock-all'],
	view: [
		'zoom-in',
		'zoom-out',
		'back-to-content',
		'zoom-to-fit',
		'zoom-to-100',
		'toggle-grid',
		'toggle-focus-mode',
	],
	export: [
		'export-as-svg',
		'export-as-png',
		'copy-as-svg',
		'copy-as-png',
		'copy-as-json',
		'toggle-transparent',
		'print',
	],
	preferences: [
		'toggle-snap-mode',
		'toggle-tool-lock',
		'toggle-wrap-mode',
		'toggle-edge-scrolling',
		'toggle-dynamic-size-mode',
		'toggle-paste-at-cursor',
		'toggle-invert-zoom',
		'toggle-debug-mode',
	],
	accessibility: ['toggle-reduce-motion', 'enhanced-a11y-mode'],
	help: ['open-cursor-chat', 'stop-following', 'exit-pen-mode'],
}

// Shortcut-only, toolbar-only or internal, or covered by a component item in the default content
// (theme, keyboard shortcuts, move to page). Turning keyboard shortcuts off here would also turn off
// the palette's own Cmd+K.
const NOT_IN_PALETTE = [
	'open-command-palette',
	'toggle-keyboard-shortcuts',
	'open-kbd-shortcuts',
	'toggle-dark-mode',
	'export-all-as-svg',
	'export-all-as-png',
	'move-to-new-page',
	'zoom-in-on-cursor',
	'zoom-out-on-cursor',
	'open-embed-link',
	'select-zoom-tool',
	'select-geo-tool',
	'select-white-color',
	'select-fill-fill',
	'select-fill-lined-fill',
	'paste-at-cursor',
	'paste-plain-text-at-cursor',
	'change-page-prev',
	'change-page-next',
	'adjust-shape-styles',
	'a11y-open-context-menu',
	'a11y-repeat-shape-announce',
	'enlarge-shapes',
	'shrink-shapes',
	'image-replace',
	'video-replace',
	'copy-hovered-styles',
]

const DISABLED_REASONS: Record<string, Reason> = {
	delete: SELECT_SHAPES[1],
	duplicate: SELECT_SHAPES[1],
	copy: SELECT_SHAPES[1],
	cut: SELECT_SHAPES[1],
	'toggle-lock': SELECT_SHAPES[1],
	'select-none': SELECT_SHAPES[1],
	'zoom-to-selection': SELECT_SHAPES[1],
	'frame-selection': SELECT_SHAPES[1],
	'flatten-to-image': SELECT_SHAPES[1],
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
	'toggle-auto-size': inSelectTool('command-palette.reason.select-text'),
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

const PLACEMENT = new Map<string, TLUiActionItem['commandPalette']>([
	...Object.entries(PALETTE_GROUPS).flatMap(([group, ids]) =>
		ids.map((id) => [id, { group }] as const)
	),
	...NOT_IN_PALETTE.map((id) => [id, false] as const),
])

// Built-ins only, before overrides run: an override that spreads an action keeps these, and one
// that sets its own fields wins.
/** @internal */
export function withCommandPaletteDefaults(actions: TLUiActionItem[]): TLUiActionItem[] {
	for (const action of actions) {
		if (action.commandPalette === undefined && PLACEMENT.has(action.id)) {
			action.commandPalette = PLACEMENT.get(action.id)
		}
		if (action.disabledReason === undefined && action.id in DISABLED_REASONS) {
			action.disabledReason = DISABLED_REASONS[action.id]
		}
	}
	return actions
}
