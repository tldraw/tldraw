import { Atom, useValue } from '@tldraw/editor'
import { memo } from 'react'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'
import { CommandPalettePosition, commandPaletteFlags } from './commandPaletteFlags'
import { CommandPaletteItemRegistration } from './CommandPaletteItemRegistration'

function FlagItem({
	id,
	label,
	description,
	flag,
}: {
	id: string
	label: string
	description: string
	flag: Atom<boolean>
}) {
	const checked = useValue(flag)
	return (
		<CommandPaletteItemRegistration
			id={`command-palette-flag-${id}`}
			label={label}
			description={description}
			checked={checked}
			disabled={false}
			pinned
			onSelect={() => {
				flag.set(!flag.get())
			}}
		/>
	)
}

const POSITIONS: { value: CommandPalettePosition; label: string; description: string }[] = [
	{ value: 'top', label: 'Position: Top', description: 'Opens in the upper part of the screen.' },
	{ value: 'center', label: 'Position: Center', description: 'Opens in the middle of the screen.' },
	{
		value: 'bottom',
		label: 'Position: Bottom',
		description: 'Opens lower down, closer to the toolbar.',
	},
]

function PositionItem({ value, label, description }: (typeof POSITIONS)[number]) {
	const position = useValue(commandPaletteFlags.position)
	return (
		<CommandPaletteItemRegistration
			id={`command-palette-flag-position-${value}`}
			label={label}
			description={description}
			checked={position === value}
			disabled={false}
			pinned
			onSelect={() => {
				commandPaletteFlags.position.set(value)
			}}
		/>
	)
}

// Memo: items re-register on every render, and each registration re-renders the shell.
/** Testing only: palette design variants, untranslated. @internal */
export const CommandPaletteFeatureFlags = memo(function CommandPaletteFeatureFlags() {
	return (
		<TldrawUiMenuSubmenu id="command-palette-feature-flags" label="Command palette feature flags">
			<FlagItem
				id="checkmarks-on-right"
				label="Checkmarks on the right"
				description="Off: every row keeps a check slot on the left, so labels line up."
				flag={commandPaletteFlags.checkmarksOnRight}
			/>
			<FlagItem
				id="show-recents"
				label="Show recents"
				description="Recently run commands above the list, and not repeated in it."
				flag={commandPaletteFlags.showRecents}
			/>
			<FlagItem
				id="show-disabled-reasons"
				label="Show disabled reasons"
				description="A highlighted unavailable command says why, e.g. Select a shape first."
				flag={commandPaletteFlags.showDisabledReasons}
			/>
			<FlagItem
				id="group-submenus"
				label="Group submenus"
				description="One row per submenu that opens its items. Off: every item gets its own row."
				flag={commandPaletteFlags.groupSubmenus}
			/>
			<FlagItem
				id="name-new-files"
				label="Name new files first"
				description="tldraw.com: New file asks for a name here. Off: default name, then rename."
				flag={commandPaletteFlags.nameNewFiles}
			/>
			{POSITIONS.map((position) => (
				<PositionItem key={position.value} {...position} />
			))}
		</TldrawUiMenuSubmenu>
	)
})
