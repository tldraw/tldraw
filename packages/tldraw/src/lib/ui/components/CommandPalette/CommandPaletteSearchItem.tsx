import { useTldrawUiMenuContext } from '../primitives/menus/TldrawUiMenuContext'
import { TLUiIconJsx } from '../primitives/TldrawUiIcon'
import { CommandPaletteItemRegistration } from './CommandPaletteItemRegistration'
import { CommandPaletteSearchResult } from './CommandPaletteStore'

/** @internal */
export interface CommandPaletteSearchItemProps {
	id: string
	label: string
	placeholder: string
	icon?: string | TLUiIconJsx
	/**
	 * The hits for the trimmed, non-empty query, shown in this order without ranking or a cap. Runs
	 * again only when the query changes.
	 */
	getResults(query: string): CommandPaletteSearchResult[]
}

/**
 * A command palette item that opens its own search in the palette, listing the hits for what's
 * typed. Renders nothing outside the palette.
 *
 * @internal
 */
export function CommandPaletteSearchItem({
	id,
	label,
	placeholder,
	icon,
	getResults,
}: CommandPaletteSearchItemProps) {
	const { type } = useTldrawUiMenuContext()
	if (type !== 'command-palette') return null
	return (
		<CommandPaletteItemRegistration
			id={id}
			label={label}
			icon={icon}
			search={{ placeholder, getResults }}
			onSelect={() => {}}
		/>
	)
}
