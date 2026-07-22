import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiIcon,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { commentsHidden, toggleCommentsHidden } from './state'

// A keyboard-shortcut glyph, not translatable copy — kept out of JSX as a constant.
const HIDE_SHORTCUT = '⇧C'

/** The overflow (⋯) dropdown in the sidebar header. For now it holds the hide/show-comments
 *  toggle; it's the home for later comment-wide controls (notifications, mark all as read).
 * @public @react */
export function CommentsOverflowMenu() {
	const editor = useEditor()
	const msg = useTranslation()
	const hidden = useValue('comments hidden', () => commentsHidden.get(editor), [editor])

	return (
		<TldrawUiDropdownMenuRoot id="comments-overflow">
			<TldrawUiDropdownMenuTrigger>
				<button
					type="button"
					className="tlui-cmt-header-btn"
					title={msg('comments.more-options')}
					aria-label={msg('comments.more-options')}
				>
					<TldrawUiIcon icon="dots-vertical" label={msg('comments.more-options')} small />
				</button>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent
				className="tlui-cmt-menu"
				side="bottom"
				align="end"
				alignOffset={0}
			>
				<TldrawUiDropdownMenuGroup>
					<TldrawUiDropdownMenuItem>
						<button
							type="button"
							className="tlui-cmt-menu-item"
							onClick={() => toggleCommentsHidden(editor)}
						>
							<span>{hidden ? msg('comments.show') : msg('comments.hide')}</span>
							<span className="tlui-cmt-menu-item__shortcut">{HIDE_SHORTCUT}</span>
						</button>
					</TldrawUiDropdownMenuItem>
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
