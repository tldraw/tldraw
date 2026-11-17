import { useEffect, useRef } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiInput,
	useEditor,
	useTranslation,
	useValue,
	type TLLibrary,
} from 'tldraw'
import { SearchIcon } from '../ui/search-icon'
import { librariesSearchQuery, librariesSearchScope } from './state'

const messages = defineMessages({
	clear: { id: 'libraries.search.clear', defaultMessage: 'Clear search' },
	searchIn: { id: 'libraries.search.placeholder-in', defaultMessage: 'Search in {name}' },
	scopedPlaceholder: { id: 'libraries.search.placeholder-scoped', defaultMessage: 'Search' },
	clearScope: { id: 'libraries.search.clear-scope', defaultMessage: 'Search all libraries' },
})

/**
 * The panel's search field. With a scope, a chip before the query names the one library searched;
 * its ✕, or Backspace in an empty field, goes back to searching all of them. Escape clears both,
 * and the field's own ✕ clears the query.
 */
export function LibrariesSearch({
	placeholder,
	scope,
}: {
	placeholder: string
	scope?: TLLibrary
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const inputRef = useRef<HTMLInputElement>(null)
	const query = useValue('libraries search query', () => librariesSearchQuery.get(editor), [editor])
	const setQuery = (value: string) => librariesSearchQuery.set(editor, value)
	const clearScope = () => librariesSearchScope.set(editor, null)
	const clearLabel = msg(messages.clear)
	const clearScopeLabel = msg(messages.clearScope)
	const scopeId = scope ? scope.id : undefined

	useEffect(() => {
		if (scopeId === undefined) return
		const input = inputRef.current
		if (!input) return
		input.focus()
		// The menu that set the scope hands focus back to its trigger once it has closed.
		const doc = editor.getContainerDocument()
		const reclaim = (e: FocusEvent) => {
			if (!(e.target instanceof Element && e.target.matches('[aria-haspopup="menu"]'))) return
			doc.removeEventListener('focusin', reclaim)
			input.focus()
		}
		doc.addEventListener('focusin', reclaim)
		return () => doc.removeEventListener('focusin', reclaim)
	}, [editor, scopeId])

	return (
		<div
			className="tlui-libraries-search"
			onKeyDown={(e) => {
				if (scope && e.key === 'Backspace' && query === '') clearScope()
			}}
		>
			<TldrawUiInput
				ref={inputRef}
				className="tlui-libraries-search__input"
				value={query}
				placeholder={scope ? msg(messages.scopedPlaceholder) : placeholder}
				aria-label={scope ? msg(messages.searchIn, { name: scope.name }) : placeholder}
				onValueChange={setQuery}
				onCancel={() => {
					setQuery('')
					clearScope()
				}}
			>
				<SearchIcon className="tlui-libraries-search__icon" />
				{scope && (
					<span className="tlui-libraries-search__scope">
						<span className="tlui-libraries-search__scope-name">{scope.name}</span>
						<TldrawUiButton
							type="icon"
							className="tlui-libraries-search__scope-clear"
							onClick={() => {
								clearScope()
								if (inputRef.current) inputRef.current.focus()
							}}
							tooltip={clearScopeLabel}
							title={clearScopeLabel}
						>
							<TldrawUiButtonIcon icon="cross-2" small />
						</TldrawUiButton>
					</span>
				)}
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
