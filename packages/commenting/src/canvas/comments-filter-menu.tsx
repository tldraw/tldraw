/* eslint-disable tldraw/jsx-no-literals */
import {
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useValue,
} from 'tldraw'
import { SidebarFilters, sidebarFilters } from './sidebar-filters'

export interface CommentsFilterMenuProps {
	/** Whether to offer the "only your threads" toggle (needs a known current user). */
	canFilterByAuthor?: boolean
}

/** The funnel dropdown in the sidebar header: toggles for which threads the list shows. */
export function CommentsFilterMenu({ canFilterByAuthor }: CommentsFilterMenuProps) {
	const filters = useValue('sidebar filters', () => sidebarFilters.get(), [])
	const toggle = (key: keyof SidebarFilters) =>
		sidebarFilters.update((f) => ({ ...f, [key]: !f[key] }))

	return (
		<TldrawUiDropdownMenuRoot id="comments-filter">
			<TldrawUiDropdownMenuTrigger>
				<button
					type="button"
					className="cmt-header-btn"
					title="Filter comments"
					aria-label="Filter comments"
				>
					<FilterIcon />
				</button>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="end">
				<TldrawUiDropdownMenuGroup>
					<TldrawUiDropdownMenuCheckboxItem
						title="Show resolved comments"
						checked={filters.showResolved}
						onSelect={() => toggle('showResolved')}
					>
						Show resolved comments
					</TldrawUiDropdownMenuCheckboxItem>
					{canFilterByAuthor && (
						<TldrawUiDropdownMenuCheckboxItem
							title="Only your threads"
							checked={filters.onlyMine}
							onSelect={() => toggle('onlyMine')}
						>
							Only your threads
						</TldrawUiDropdownMenuCheckboxItem>
					)}
					<TldrawUiDropdownMenuCheckboxItem
						title="Only current page"
						checked={filters.onlyCurrentPage}
						onSelect={() => toggle('onlyCurrentPage')}
					>
						Only current page
					</TldrawUiDropdownMenuCheckboxItem>
				</TldrawUiDropdownMenuGroup>
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
