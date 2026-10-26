import { useTldrawUiMenuContext } from '../primitives/menus/TldrawUiMenuContext'
import { CommandPaletteItemRegistration } from './CommandPaletteItemRegistration'

/** @public */
export interface CommandPalettePromptItemProps {
	id: string
	label: string
	placeholder: string
	/** Prefills the input, selected so typing replaces it. */
	initialValue?: string
	/** Gets the trimmed text, which may be empty. */
	onSubmit(value: string): void
}

/**
 * A command palette item that asks for text (e.g. a name) in the palette before running, with
 * rows that say what Enter does and a Cancel row. Renders nothing outside the palette.
 *
 * @public @react
 */
export function CommandPalettePromptItem({
	id,
	label,
	placeholder,
	initialValue,
	onSubmit,
}: CommandPalettePromptItemProps) {
	const { type } = useTldrawUiMenuContext()
	if (type !== 'command-palette') return null
	return (
		<CommandPaletteItemRegistration
			id={id}
			label={label}
			disabled={false}
			prompt={{ placeholder, initialValue, onSubmit }}
			onSelect={() => {}}
		/>
	)
}
