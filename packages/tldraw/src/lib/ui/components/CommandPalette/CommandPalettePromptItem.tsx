import { unwrapLabel } from '../../context/actions'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { useTldrawUiMenuContext } from '../primitives/menus/TldrawUiMenuContext'
import { CommandPaletteItemRegistration } from './CommandPaletteItemRegistration'

/**
 * Props for {@link CommandPalettePromptItem}.
 *
 * @public
 */
export interface TLUiCommandPalettePromptItemProps<TranslationKey extends string = string> {
	/** Keys the item in recents. Only the first palette item with a given id is listed. */
	id: string
	/**
	 * The label to display on the item. If it's a string, it will be translated. If it's an object, the keys will be used as the language keys and the values will be translated.
	 */
	label: TranslationKey | { [key: string]: TranslationKey }
	/**
	 * The input's placeholder while prompting. Translated like `label`.
	 */
	placeholder: TranslationKey | { [key: string]: TranslationKey }
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
export function CommandPalettePromptItem<TranslationKey extends string = string>({
	id,
	label,
	placeholder,
	initialValue,
	onSubmit,
}: TLUiCommandPalettePromptItemProps<TranslationKey>) {
	const { type } = useTldrawUiMenuContext()
	const msg = useTranslation()
	if (type !== 'command-palette') return null
	const translate = (text: typeof label) => msg(unwrapLabel(text, type) as TLUiTranslationKey) ?? ''
	return (
		<CommandPaletteItemRegistration
			id={id}
			label={translate(label)}
			prompt={{ placeholder: translate(placeholder), initialValue, onSubmit }}
			onSelect={() => {}}
		/>
	)
}
