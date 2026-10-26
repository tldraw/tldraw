import type { TLUiActionItem } from './actions'

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
		'toggle-minimap',
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
// (theme, keyboard shortcuts, move to page, the image group). Turning keyboard shortcuts off here would also turn off
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
	'crop-image',
	'video-replace',
	'copy-hovered-styles',
	'toggle-group',
	'toggle-frame',
]

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
	}
	return actions
}
