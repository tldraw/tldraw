import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiInput,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { SearchIcon } from '../ui/search-icon'
import { librariesSearchQuery } from './state'

const messages = defineMessages({
	clear: { id: 'libraries.search.clear', defaultMessage: 'Clear search' },
})

/** The panel's search field. Escape or the ✕ clears the query. */
export function LibrariesSearch({ label, placeholder }: { label: string; placeholder: string }) {
	const editor = useEditor()
	const msg = useTranslation()
	const query = useValue('libraries search query', () => librariesSearchQuery.get(editor), [editor])
	const setQuery = (value: string) => librariesSearchQuery.set(editor, value)
	const clearLabel = msg(messages.clear)

	return (
		<div className="tlui-libraries-search">
			<TldrawUiInput
				className="tlui-libraries-search__input"
				value={query}
				placeholder={placeholder}
				aria-label={label}
				onValueChange={setQuery}
				onCancel={() => setQuery('')}
			>
				<SearchIcon className="tlui-libraries-search__icon" />
			</TldrawUiInput>
			{query.length > 0 && (
				<TldrawUiButton
					type="icon"
					className="tlui-libraries-search__clear"
					onClick={() => setQuery('')}
					tooltip={clearLabel}
					title={clearLabel}
				>
					<TldrawUiButtonIcon icon="cross-2" small />
				</TldrawUiButton>
			)}
		</div>
	)
}
