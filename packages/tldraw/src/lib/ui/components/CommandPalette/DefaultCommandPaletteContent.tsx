import {
	CommandPaletteActionGroup,
	CommandPaletteArrangeGroup,
	CommandPaletteEditGroup,
	CommandPaletteExportGroup,
	CommandPaletteHelpGroup,
	CommandPalettePagesGroup,
	CommandPalettePreferencesGroup,
	CommandPaletteSelectionGroup,
	CommandPaletteViewGroup,
} from './CommandPaletteGroups'

/**
 * The default command palette groups, then a catch-all for actions none of them list, such as an
 * app's custom actions. Selection groups come first: they lead while something is selected.
 *
 * @public @react
 */
export function DefaultCommandPaletteContent() {
	return (
		<>
			<CommandPaletteSelectionGroup />
			<CommandPaletteArrangeGroup />
			<CommandPaletteEditGroup />
			<CommandPaletteViewGroup />
			<CommandPalettePagesGroup />
			<CommandPaletteExportGroup />
			<CommandPalettePreferencesGroup />
			<CommandPaletteHelpGroup />
			<CommandPaletteActionGroup />
		</>
	)
}
