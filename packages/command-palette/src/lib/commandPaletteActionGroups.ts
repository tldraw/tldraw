import { createContext, useContext } from 'react'

/**
 * Where the command palette lists actions, by action id: the `group` of the
 * {@link CommandPaletteActionGroup} that lists it, or `false` to leave it out. Actions without an
 * entry, such as an app's custom actions, go to the catch-all group.
 *
 * @public
 */
export type TLUiCommandPaletteActionGroups = Record<string, string | false>

/**
 * Where the command palette lists tldraw's built-in actions. Internal and shortcut-only actions,
 * and ones the default groups cover another way, are left out. Pass `actionGroups` to
 * {@link CommandPalette} or {@link DefaultCommandPalette} to change entries or add your own.
 *
 * @public
 */
export const defaultCommandPaletteActionGroups: Readonly<TLUiCommandPaletteActionGroups> = {
	'edit-link': 'selection',
	'insert-embed': 'edit',
	'open-kbd-shortcuts': false,
	'insert-media': 'edit',
	undo: 'edit',
	redo: 'edit',
	'export-as-svg': 'export',
	'export-as-png': 'export',
	'export-all-as-svg': false,
	'export-all-as-png': false,
	'copy-as-svg': 'export',
	'copy-as-png': 'export',
	'copy-as-json': 'export',
	'toggle-auto-size': 'selection',
	'open-embed-link': false,
	'select-zoom-tool': false,
	'convert-to-bookmark': 'selection',
	'convert-to-embed': 'selection',
	duplicate: 'selection',
	ungroup: 'selection',
	group: 'selection',
	'toggle-group': false,
	'frame-selection': 'selection',
	'remove-frame': 'selection',
	'toggle-frame': false,
	'fit-frame-to-content': 'selection',
	'align-left': 'arrange',
	'align-center-horizontal': 'arrange',
	'align-right': 'arrange',
	'align-center-vertical': 'arrange',
	'align-top': 'arrange',
	'align-bottom': 'arrange',
	'distribute-horizontal': 'arrange',
	'distribute-vertical': 'arrange',
	'stretch-horizontal': 'arrange',
	'stretch-vertical': 'arrange',
	'flip-horizontal': 'arrange',
	'flip-vertical': 'arrange',
	pack: 'arrange',
	'stack-vertical': 'arrange',
	'stack-horizontal': 'arrange',
	'bring-to-front': 'arrange',
	'bring-forward': 'arrange',
	'send-backward': 'arrange',
	'send-to-back': 'arrange',
	cut: 'selection',
	copy: 'selection',
	paste: 'edit',
	'paste-at-cursor': false,
	'paste-plain-text-at-cursor': false,
	'select-all': 'edit',
	'select-none': 'selection',
	delete: 'selection',
	'rotate-cw': 'arrange',
	'rotate-ccw': 'arrange',
	'zoom-in': 'view',
	'zoom-in-on-cursor': false,
	'zoom-out': 'view',
	'zoom-out-on-cursor': false,
	'zoom-to-100': 'view',
	'zoom-to-fit': 'view',
	'zoom-to-selection': 'selection',
	'toggle-snap-mode': 'preferences',
	// The color scheme submenu covers it.
	'toggle-dark-mode': false,
	'toggle-wrap-mode': 'preferences',
	'toggle-dynamic-size-mode': 'preferences',
	'toggle-paste-at-cursor': 'preferences',
	'toggle-reduce-motion': 'accessibility',
	'toggle-keyboard-shortcuts': false,
	'enhanced-a11y-mode': 'accessibility',
	'toggle-edge-scrolling': 'preferences',
	'toggle-invert-zoom': 'preferences',
	'toggle-transparent': 'export',
	'toggle-tool-lock': 'preferences',
	'unlock-all': 'edit',
	'toggle-focus-mode': 'view',
	'toggle-minimap': 'view',
	'toggle-grid': 'view',
	'toggle-debug-mode': 'preferences',
	print: 'export',
	'exit-pen-mode': 'help',
	'stop-following': 'help',
	'back-to-content': 'view',
	'toggle-lock': 'selection',
	'move-to-new-page': false,
	'select-white-color': false,
	'select-fill-fill': false,
	'select-fill-lined-fill': false,
	'flatten-to-image': 'selection',
	'select-geo-tool': false,
	'change-page-prev': false,
	'change-page-next': false,
	'adjust-shape-styles': false,
	'a11y-open-context-menu': false,
	'enlarge-shapes': false,
	'shrink-shapes': false,
	'a11y-repeat-shape-announce': false,
	// The image group lists these while an image is selected.
	'crop-image': false,
	'image-replace': false,
	'video-replace': false,
	'download-original': 'selection',
	'copy-hovered-styles': false,
	'open-cursor-chat': 'help',
	'open-command-palette': false,
}

const ActionGroupsContext = createContext<Readonly<TLUiCommandPaletteActionGroups>>(
	defaultCommandPaletteActionGroups
)

/** @internal */
export const CommandPaletteActionGroupsProvider = ActionGroupsContext.Provider

/** @internal */
export function useCommandPaletteActionGroups() {
	return useContext(ActionGroupsContext)
}
