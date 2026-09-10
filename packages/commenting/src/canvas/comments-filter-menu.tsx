import {
	TldrawUiButton,
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
import { MoreMenuIcon } from '../ui/icons'
import { SidebarFilters } from './sidebar-filters'
import { sidebarFilters } from './state'

/** @public */
export interface CommentsFilterMenuProps {
	/** Whether to offer the "only your threads" toggle (needs a known current user). */
	canFilterByAuthor?: boolean
	/** Whether to offer the "only unread" toggle (needs a read-status source). */
	canFilterByUnread?: boolean
}

/** The funnel dropdown in the sidebar header: toggles for which threads the list shows.
 * @public @react */
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
				<TldrawUiButton
					type="icon"
					tooltip={msg('comments.filter')}
					title={msg('comments.filter')}
					className="tlui-cmt-header-btn"
				>
					<MoreMenuIcon />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			{/* No tlui-cmt-menu here: the rows are tldraw menu items, which carry their own insets —
			    the extra padding would set this menu apart from the canvas menus it should match. */}
			<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="menu">
					<TldrawUiMenuGroup id="comments-filter">
						<TldrawUiMenuCheckboxItem
							id="show-all-pages"
							label="comments.show-all-pages"
							checked={!filters.onlyCurrentPage}
							onSelect={() => toggle('onlyCurrentPage')}
						/>
						{canFilterByAuthor && (
							<TldrawUiMenuCheckboxItem
								id="only-my-comments"
								label="comments.only-my-comments"
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
							id="show-resolved"
							label="comments.show-resolved"
							checked={filters.showResolved}
							onSelect={() => toggle('showResolved')}
						/>
					</TldrawUiMenuGroup>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
