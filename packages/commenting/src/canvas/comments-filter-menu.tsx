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
					<FunnelIcon />
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

function FunnelIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M2.75 3.5h10.5a.5.5 0 0 1 .4.8L9.5 9.7v3.05a.5.5 0 0 1-.72.45l-1.5-.75a.5.5 0 0 1-.28-.45V9.7L2.35 4.3a.5.5 0 0 1 .4-.8Z"
				fill="currentColor"
			/>
		</svg>
	)
}
