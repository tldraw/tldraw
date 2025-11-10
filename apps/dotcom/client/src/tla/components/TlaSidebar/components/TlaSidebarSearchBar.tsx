import { memo, useCallback, useRef } from 'react'
import { TldrawUiInput, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	search: { defaultMessage: 'Search' },
	clearSearch: { defaultMessage: 'Clear search' },
})

export const TlaSidebarSearchBar = memo(function TlaSidebarSearchBar() {
	const app = useApp()
	const inputRef = useRef<HTMLInputElement>(null)
	const trackEvent = useTldrawAppUiEvents()

	const handleClear = useCallback(() => {
		app.sidebarSearch.set({ isFocused: false, query: '' })
		inputRef.current?.focus()
		trackEvent('sidebar-search-clear', { source: 'sidebar' })
	}, [app, trackEvent])

	const handleFocus = useCallback(() => {
		app.sidebarSearch.update((p) => ({ ...p, isFocused: true }))
		inputRef.current?.select()
		trackEvent('sidebar-search', { source: 'sidebar' })
	}, [app, trackEvent])

	const handleBlur = useCallback(() => {
		app.sidebarSearch.update((p) => ({ ...p, isFocused: false }))
	}, [app])

	const handleSearchQueryChange = useCallback(
		(query: string) => {
			app.sidebarSearch.update((p) => ({ ...p, query }))
		},
		[app]
	)

	const queryValue = useValue('sidebar-search-query', () => app.sidebarSearch.get().query, [app])
	const searchMessage = useMsg(messages.search)
	const clearSearchMessage = useMsg(messages.clearSearch)

	return (
		<div className={styles.sidebarSearchBar}>
			<div className={styles.sidebarSearchBarIcon}>
				<TlaIcon icon="search" ariaLabel={searchMessage} />
			</div>
			<TldrawUiInput
				ref={inputRef}
				value={queryValue}
				onValueChange={handleSearchQueryChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				placeholder={searchMessage}
				data-testid="tla-sidebar-search-input"
				autoSelect
			/>
			{queryValue && (
				<button
					className={styles.sidebarSearchBarClearButton}
					aria-label={clearSearchMessage}
					data-testid="tla-sidebar-search-clear"
					onClick={handleClear}
				>
					<TlaIcon icon="close-strong" />
				</button>
			)}
		</div>
	)
})
