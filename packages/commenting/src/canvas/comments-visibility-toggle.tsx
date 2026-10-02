import { defineMessages, TldrawUiButton, useEditor, useTranslation, useValue } from 'tldraw'
import { EyeClosedIcon, EyeOpenIcon } from '../ui/icons'
import { commentsHidden, toggleCommentsHidden } from './state'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	commentsHide: { id: 'comments.hide', defaultMessage: 'Hide comments' },
	commentsShow: { id: 'comments.show', defaultMessage: 'Show comments' },
})

/** The sidebar header's show/hide toggle for comment pins — an eye that closes while comments
 *  are hidden. The same state as the Shift+C shortcut.
 * @public @react */
export function CommentsVisibilityToggle() {
	const editor = useEditor()
	const msg = useTranslation()
	const hidden = useValue('comments hidden', () => commentsHidden.get(editor), [editor])
	const label = hidden ? msg(messages.commentsShow.id) : msg(messages.commentsHide.id)

	return (
		<TldrawUiButton
			type="icon"
			tooltip={label}
			title={label}
			className="tlui-cmt-header-btn"
			onClick={() => toggleCommentsHidden(editor)}
		>
			{hidden ? <EyeClosedIcon /> : <EyeOpenIcon />}
		</TldrawUiButton>
	)
}
