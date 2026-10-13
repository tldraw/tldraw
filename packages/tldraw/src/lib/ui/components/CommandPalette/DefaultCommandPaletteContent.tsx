import {
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
			{/* Below the commands: most tools are a key away, so they're mostly found by search. */}
			<CommandPaletteToolsGroup />
			<CommandPalettePreferencesGroup />
			<CommandPaletteHelpGroup />
			<CommandPaletteActionGroup />
		</>
	)
}
