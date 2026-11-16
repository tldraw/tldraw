import { registerTldrawLibraryVersion } from 'tldraw'

export { CommandPalette, commandPaletteOverrides } from './lib/CommandPalette'
export {
	defaultCommandPaletteActionGroups,
	type TLUiCommandPaletteActionGroups,
} from './lib/commandPaletteActionGroups'
export {
	CommandPaletteOnDemand,
	CommandPalettePinned,
	useCommandPaletteQuery,
	type TLUiCommandPaletteOnDemandProps,
	type TLUiCommandPalettePinnedProps,
} from './lib/CommandPaletteContext'
export {
	CommandPaletteActionGroup,
	CommandPaletteArrangeGroup,
	CommandPaletteEditGroup,
	CommandPaletteExportGroup,
	CommandPaletteHelpGroup,
	CommandPalettePagesGroup,
	CommandPalettePreferencesGroup,
	CommandPaletteSelectionGroup,
	CommandPaletteToolsGroup,
	CommandPaletteViewGroup,
	type TLUiCommandPaletteActionGroupProps,
} from './lib/CommandPaletteGroups'
export { CommandPaletteImageGroup } from './lib/CommandPaletteImageGroup'
export { CommandPaletteMenuItem } from './lib/CommandPaletteMenuItem'
export {
	CommandPalettePromptItem,
	type TLUiCommandPalettePromptItemProps,
} from './lib/CommandPalettePromptItem'
export { getCommandPaletteMatchScore } from './lib/commandPaletteSearch'
export {
	CommandPaletteShell,
	type TLUiCommandPalettePosition,
	type TLUiCommandPaletteShellProps,
	type TLUiCommandPaletteSuggestions,
} from './lib/CommandPaletteShell'
export { CommandPaletteStylesGroup } from './lib/CommandPaletteStylesGroup'
export {
	DefaultCommandPalette,
	type TLUiCommandPaletteProps,
	type TLUiDefaultCommandPaletteProps,
} from './lib/DefaultCommandPalette'
export { DefaultCommandPaletteContent } from './lib/DefaultCommandPaletteContent'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
