import { Atom, useValue } from '@tldraw/editor'
import { memo } from 'react'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'
import {
	CommandPalettePosition,
	CommandPaletteTopSection,
	commandPaletteFlags,
} from './commandPaletteFlags'
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

interface Choice<T> {
	value: T
	label: string
	description: string
}

// One row per value of a pick-one flag, checked when it's the current one.
function ChoiceItem<T extends string>({
	id,
	flag,
	value,
	label,
	description,
}: Choice<T> & { id: string; flag: Atom<T> }) {
	const current = useValue(flag)
	return (
		<CommandPaletteItemRegistration
			id={`command-palette-flag-${id}-${value}`}
			label={label}
			description={description}
			checked={current === value}
			disabled={false}
			pinned
			onSelect={() => {
				flag.set(value)
			}}
		/>
	)
}

const TOP_SECTIONS: Choice<CommandPaletteTopSection>[] = [
	{
		value: 'recent',
		label: 'Top: Recent',
		description: "Recently run commands lead the list, and aren't repeated in it.",
	},
	{
		value: 'suggested',
		label: 'Top: Suggested',
		description: 'Commands for what is selected lead the list, and break ties in search.',
	},
	{ value: 'none', label: 'Top: Nothing', description: 'The list starts with the groups.' },
]

const POSITIONS: Choice<CommandPalettePosition>[] = [
	{ value: 'top', label: 'Position: Top', description: 'Opens in the upper part of the screen.' },
	{ value: 'center', label: 'Position: Center', description: 'Opens in the middle of the screen.' },
	{
		value: 'bottom',
		label: 'Position: Bottom',
		description: 'Opens lower down, closer to the toolbar.',
	},
]

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
			{TOP_SECTIONS.map((choice) => (
				<ChoiceItem key={choice.value} id="top" flag={commandPaletteFlags.topSection} {...choice} />
			))}
			<FlagItem
				id="show-group-headings"
				label="Show group headings"
				description="Heads each group while browsing, like Recent. Off: groups run together."
				flag={commandPaletteFlags.showGroupHeadings}
			/>
			<FlagItem
				id="show-icons"
				label="Show icons"
				description="An icon before each label, from the item's menu icon. Rows without one keep the space."
				flag={commandPaletteFlags.showIcons}
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
			{POSITIONS.map((choice) => (
				<ChoiceItem
					key={choice.value}
					id="position"
					flag={commandPaletteFlags.position}
					{...choice}
				/>
			))}
		</TldrawUiMenuSubmenu>
	)
})
