import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { SidebarFilters } from './sidebar-filters'
import { sidebarFilters } from './state'

export interface CommentsFilterMenuProps {
	/** Whether to offer the "only your threads" toggle (needs a known current user). */
	canFilterByAuthor?: boolean
	/** Whether to offer the "only unread" toggle (needs a read-status source). */
	canFilterByUnread?: boolean
}

/** The funnel dropdown in the sidebar header: toggles for which threads the list shows. */
export function CommentsFilterMenu({
	canFilterByAuthor,
	canFilterByUnread,
}: CommentsFilterMenuProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const filters = useValue('sidebar filters', () => sidebarFilters.get(editor), [editor])
	const toggle = (key: keyof SidebarFilters) => {
		sidebarFilters.update(editor, (f) => ({ ...f, [key]: !f[key] }))
	}

	return (
		<TldrawUiDropdownMenuRoot id="comments-filter">
			<TldrawUiDropdownMenuTrigger>
				<button
					type="button"
					className="cmt-header-btn"
					title={msg('comments.filter')}
					aria-label={msg('comments.filter')}
				>
					<FilterIcon />
				</button>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="start">
				<TldrawUiMenuContextProvider type="menu" sourceId="menu">
					<TldrawUiMenuGroup id="comments-filter">
						<TldrawUiMenuCheckboxItem
							id="show-resolved"
							label="comments.show-resolved"
							checked={filters.showResolved}
							onSelect={() => toggle('showResolved')}
						/>
						{canFilterByAuthor && (
							<TldrawUiMenuCheckboxItem
								id="only-mine"
								label="comments.only-mine"
								checked={filters.onlyMine}
								onSelect={() => toggle('onlyMine')}
							/>
						)}
						{canFilterByUnread && (
							<TldrawUiMenuCheckboxItem
								id="only-unread"
								label="comments.only-unread"
								checked={filters.onlyUnread}
								onSelect={() => toggle('onlyUnread')}
							/>
						)}
						<TldrawUiMenuCheckboxItem
							id="only-current-page"
							label="comments.only-current-page"
							checked={filters.onlyCurrentPage}
							onSelect={() => toggle('onlyCurrentPage')}
						/>
					</TldrawUiMenuGroup>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}

function FilterIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<line x1="2.5" y1="5" x2="13.5" y2="5" />
			<line x1="2.5" y1="11" x2="13.5" y2="11" />
			<circle cx="6" cy="5" r="1.9" fill="currentColor" stroke="none" />
			<circle cx="10.5" cy="11" r="1.9" fill="currentColor" stroke="none" />
		</svg>
	)
}
