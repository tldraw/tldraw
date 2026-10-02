import {
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
 * The default command palette groups. Selection groups come first: they lead while something is
 * selected and render nothing otherwise.
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
		</>
	)
}
