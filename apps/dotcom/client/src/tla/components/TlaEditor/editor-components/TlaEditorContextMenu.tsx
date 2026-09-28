import { startCommentAt, useCanComment, useCommentingEnabled } from '@tldraw/commenting'
import { useState } from 'react'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	TLUiContextMenuProps,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useEditor,
	useTools,
} from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'

export function TlaEditorContextMenu(props: TLUiContextMenuProps) {
	// Same gate as the comment button in quick actions, so signed-out visitors get the entry too
	// and it prompts them to sign in.
	const commentingEnabled = useCommentingEnabled()
	return (
		<DefaultContextMenu {...props}>
			{commentingEnabled && (
				<TldrawUiMenuGroup id="comment">
					<CommentMenuItem />
				</TldrawUiMenuGroup>
			)}
			<DefaultContextMenuContent />
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
			// Signed-out visitors fall through to the tool's own onSelect, which opens sign-in.
			onSelect={(source) =>
				canComment ? startCommentAt(editor, point) : commentTool.onSelect(source)
			}
		/>
	)
}
