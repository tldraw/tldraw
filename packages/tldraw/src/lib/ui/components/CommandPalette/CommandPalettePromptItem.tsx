import { useTldrawUiMenuContext } from '../primitives/menus/TldrawUiMenuContext'
import { CommandPaletteItemRegistration } from './CommandPaletteItemRegistration'

/** @internal */
export interface CommandPalettePromptItemProps {
	id: string
	label: string
	placeholder: string
	/** Gets the trimmed text, which may be empty. */
	onSubmit(value: string): void
}

/**
 * A command palette item that asks for text (e.g. a name) in the palette before running. Renders
 * nothing outside the palette.
 *
 * @internal
 */
export function CommandPalettePromptItem({
	id,
	label,
	placeholder,
	onSubmit,
}: CommandPalettePromptItemProps) {
	const { type } = useTldrawUiMenuContext()
	if (type !== 'command-palette') return null
	return (
		<CommandPaletteItemRegistration
			id={id}
			label={label}
			disabled={false}
			prompt={{ placeholder, onSubmit }}
			onSelect={() => {}}
		/>
	)
}
