import {
	unwrapLabel,
	useReadonly,
	TLUiTranslationKey,
	useTranslation,
	useTldrawUiMenuContext,
} from 'tldraw'
import { commandPaletteCollector } from './commandPaletteCollector'
import { CommandPaletteItemRegistration } from './CommandPaletteItemRegistration'

/** @public */
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
	/**
	 * If the editor is in readonly mode and the item is not marked as readonlyok, it will not be rendered.
	 */
	readonlyOk?: boolean
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
	readonlyOk = false,
	onSubmit,
}: TLUiCommandPalettePromptItemProps<TranslationKey>) {
	const { type, collector } = useTldrawUiMenuContext()
	const msg = useTranslation()
	const isReadonlyMode = useReadonly()
	if (collector !== commandPaletteCollector || (isReadonlyMode && !readonlyOk)) return null
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
