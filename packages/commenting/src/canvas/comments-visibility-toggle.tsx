import { TldrawUiButton, useEditor, useTranslation, useValue } from 'tldraw'
import { EyeClosedIcon, EyeOpenIcon } from '../ui/icons'
import { commentsHidden, toggleCommentsHidden } from './state'

/** The sidebar header's show/hide toggle for comment pins — an eye that closes while comments
 *  are hidden. The same state as the Shift+C shortcut.
 * @public @react */
export function CommentsVisibilityToggle() {
	const editor = useEditor()
	const msg = useTranslation()
	const hidden = useValue('comments hidden', () => commentsHidden.get(editor), [editor])
	const label = hidden ? msg('comments.show') : msg('comments.hide')

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
