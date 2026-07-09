import { TlButton, TlInput } from '@tldraw/ui'
import classNames from 'classnames'
import { useCallback, useRef, useState } from 'react'
import { useApp } from '../../../hooks/useAppState'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	search: { defaultMessage: 'Search...' },
	clearSearch: { defaultMessage: 'Clear search' },
})

/**
 * The sidebar search action. It renders as a regular action row until the user
 * clicks it, at which point it becomes an inline input (like renaming a file)
 * that filters the file list below as you type. An X button — shown once the
 * field has text — clears it, and clicking away from an empty field, or pressing
 * Escape, exits search.
 */
export function TlaSidebarSearch() {
	const app = useApp()
	const [isSearching, setIsSearching] = useState(false)
	const [query, setLocalQuery] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	const searchLbl = useMsg(messages.search)
	const clearLbl = useMsg(messages.clearSearch)

	const setQuery = useCallback(
		(searchQuery: string) => {
			setLocalQuery(searchQuery)
			app.sidebarState.update((prev) => ({ ...prev, searchQuery }))
		},
		[app]
	)

	const handleOpen = useCallback(() => {
		setIsSearching(true)
	}, [])

	const handleClose = useCallback(() => {
		setIsSearching(false)
		setQuery('')
	}, [setQuery])

	const handleClear = useCallback(() => {
		const input = inputRef.current
		if (input) {
			input.value = ''
			// Clear without focusing the field: blur it if it currently has focus,
			// and leave it blurred if it doesn't. Clicking the X should never pull
			// focus into the search input.
			input.blur()
		}
		setQuery('')
	}, [setQuery])

	const handleBlur = useCallback(
		(value: string) => {
			// Leave search mode when focus moves away from an empty field. A
			// non-empty field stays open so the filter survives clicking a result.
			if (!value.trim()) handleClose()
		},
		[handleClose]
	)

	if (!isSearching) {
		return (
			<button
				className={classNames(styles.sidebarActionButton, styles.hoverable, 'tla-text_ui__regular')}
				onClick={handleOpen}
				data-testid="tla-sidebar-search"
			>
				<TlaIcon icon="search" />
				<span className={styles.sidebarActionButtonLabel}>{searchLbl}</span>
			</button>
		)
	}

	return (
		<div
			className={classNames(styles.sidebarSearch, styles.hoverable)}
			data-testid="tla-sidebar-search-row"
		>
			<TlaIcon icon="search" className={styles.sidebarSearchIcon} />
			<TlInput
				ref={inputRef}
				className={classNames(styles.sidebarSearchInput, 'tla-text_ui__regular')}
				placeholder={searchLbl}
				onValueChange={setQuery}
				onCancel={handleClose}
				onBlur={handleBlur}
				autoFocus
				autoSelect
				data-testid="tla-sidebar-search-input"
			/>
			{query.length > 0 && (
				<TlButton
					type="icon"
					className={styles.sidebarSearchClear}
					onClick={handleClear}
					tooltip={clearLbl}
					title={clearLbl}
					data-testid="tla-sidebar-search-clear"
				>
					<TlaIcon icon="close" style={{ width: 12, height: 12 }} />
				</TlButton>
			)}
		</div>
	)
}
