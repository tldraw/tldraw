import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useTranslation,
	useValue,
} from 'tldraw'
import { commentsHidden, toggleCommentsHidden } from './comments-visibility'

// A keyboard-shortcut glyph, not translatable copy — kept out of JSX as a constant.
const HIDE_SHORTCUT = '⇧C'

/** The overflow (⋯) dropdown in the sidebar header. For now it holds the hide/show-comments
 *  toggle; it's the home for later comment-wide controls (notifications, mark all as read). */
export function CommentsOverflowMenu() {
	const msg = useTranslation()
	const hidden = useValue('comments hidden', () => commentsHidden.get(), [])

	return (
		<TldrawUiDropdownMenuRoot id="comments-overflow">
			<TldrawUiDropdownMenuTrigger>
				<button
					type="button"
					className="cmt-header-btn"
					title={msg('comments.more-options')}
					aria-label={msg('comments.more-options')}
				>
					<MoreIcon />
				</button>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="end">
				<TldrawUiDropdownMenuGroup>
					<TldrawUiDropdownMenuItem>
						<button type="button" className="cmt-menu-item" onClick={toggleCommentsHidden}>
							<span>{hidden ? msg('comments.show') : msg('comments.hide')}</span>
							<span className="cmt-menu-item__shortcut">{HIDE_SHORTCUT}</span>
						</button>
					</TldrawUiDropdownMenuItem>
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}

function MoreIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<circle cx="3" cy="8" r="1.4" />
			<circle cx="8" cy="8" r="1.4" />
			<circle cx="13" cy="8" r="1.4" />
		</svg>
	)
}
