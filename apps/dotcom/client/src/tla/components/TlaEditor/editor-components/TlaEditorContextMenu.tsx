import { startCommentAt, useCanComment } from '@tldraw/commenting'
import { useState } from 'react'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	TLUiContextMenuProps,
	TldrawUiMenuItem,
	useEditor,
	useTools,
} from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'

export function TlaEditorContextMenu(props: TLUiContextMenuProps) {
	return (
		<DefaultContextMenu {...props}>
			<DefaultContextMenuContent commentSlot={<CommentMenuItem />} />
		</DefaultContextMenu>
	)
}

function CommentMenuItem() {
	const editor = useEditor()
	const commentTool = useTools().comment
	const app = useMaybeApp()
	const canComment = useCanComment(app?.userId ?? null)
	// The menu content mounts on open, so this is where the user right-clicked. Read it now:
	// by the time an item is selected the pointer has moved onto the menu.
	const [point] = useState(() => editor.inputs.getCurrentPagePoint().clone())
	if (!commentTool) return null
	return (
		<TldrawUiMenuItem
			{...commentTool}
			// `c` enters the tool rather than opening a composer here, so don't advertise it.
			kbd={undefined}
			// Signed-out visitors fall through to the tool's own onSelect, which opens sign-in.
			onSelect={(source) =>
				canComment ? startCommentAt(editor, point) : commentTool.onSelect(source)
			}
		/>
	)
}
