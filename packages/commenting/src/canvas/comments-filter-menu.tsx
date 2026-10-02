import {
	defineMessages,
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

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	commentsFilter: { id: 'comments.filter', defaultMessage: 'Filter comments' },
	commentsOnlyMyComments: { id: 'comments.only-my-comments', defaultMessage: 'Only my comments' },
	commentsOnlyUnread: { id: 'comments.only-unread', defaultMessage: 'Only unread' },
	commentsShowAllPages: { id: 'comments.show-all-pages', defaultMessage: 'Show all pages' },
	commentsShowResolved: { id: 'comments.show-resolved', defaultMessage: 'Show resolved comments' },
})

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
					tooltip={msg(messages.commentsFilter.id)}
					title={msg(messages.commentsFilter.id)}
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
							label={messages.commentsShowAllPages.id}
							checked={!filters.onlyCurrentPage}
							onSelect={() => toggle('onlyCurrentPage')}
						/>
						{canFilterByAuthor && (
							<TldrawUiMenuCheckboxItem
								id="only-my-comments"
								label={messages.commentsOnlyMyComments.id}
								checked={filters.onlyMine}
								onSelect={() => toggle('onlyMine')}
							/>
						)}
						{canFilterByUnread && (
							<TldrawUiMenuCheckboxItem
								id="only-unread"
								label={messages.commentsOnlyUnread.id}
								checked={filters.onlyUnread}
								onSelect={() => toggle('onlyUnread')}
							/>
						)}
						<TldrawUiMenuCheckboxItem
							id="show-resolved"
							label={messages.commentsShowResolved.id}
							checked={filters.showResolved}
							onSelect={() => toggle('showResolved')}
						/>
					</TldrawUiMenuGroup>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
