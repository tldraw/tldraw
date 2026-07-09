import { TldrawUiMenuCheckboxItem, useValue } from 'tldraw'
import { commentsHidden, toggleCommentsHidden } from './comments-visibility'

/**
 * A checkbox menu item for a "View" menu that shows/hides comment pins on the canvas — checked
 * when comments are visible, like tldraw's own grid/snap toggles. Reads and toggles the shared
 * {@link commentsHidden} signal, so it stays in sync with the Shift+C shortcut and the sidebar
 * control. Drop it into whichever menu your app owns.
 */
export function CommentsMenuItem() {
	const hidden = useValue('comments hidden', () => commentsHidden.get(), [])
	return (
		<TldrawUiMenuCheckboxItem
			id="comments-visible"
			label="Comments"
			kbd="!c"
			readonlyOk
			checked={!hidden}
			onSelect={() => toggleCommentsHidden()}
		/>
	)
}
