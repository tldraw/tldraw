import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiIcon,
	TldrawUiKbd,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { commentsHidden, toggleCommentsHidden } from './state'

const messages = defineMessages({
	commentsMoreOptions: { id: 'comments.more-options', defaultMessage: 'More options' },
	commentsHide: { id: 'comments.hide', defaultMessage: 'Hide comments' },
	commentsShow: { id: 'comments.show', defaultMessage: 'Show comments' },
})

// tldraw's kbd notation (`!` = shift), rendered per platform by TldrawUiKbd.
const HIDE_SHORTCUT = '!c'

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
				<TldrawUiButton
					type="icon"
					tooltip={msg(messages.commentsMoreOptions)}
					title={msg(messages.commentsMoreOptions)}
					className="tlui-cmt-header-btn"
				>
					<TldrawUiIcon icon="dots-vertical" label={msg(messages.commentsMoreOptions)} small />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0} sideOffset={4}>
				<TldrawUiDropdownMenuGroup>
					<TldrawUiDropdownMenuItem>
						<TldrawUiButton type="menu" onClick={() => toggleCommentsHidden(editor)}>
							<TldrawUiButtonLabel>
								{hidden ? msg(messages.commentsShow) : msg(messages.commentsHide)}
							</TldrawUiButtonLabel>
							<TldrawUiKbd>{HIDE_SHORTCUT}</TldrawUiKbd>
						</TldrawUiButton>
					</TldrawUiDropdownMenuItem>
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
