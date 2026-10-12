import { startCommentAt, useCanComment, useCommentingEnabled } from '@tldraw/commenting'
import { useState } from 'react'
import {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	CursorChatItem,
	DefaultContextMenu,
	EditMenuSubmenu,
	MoveToPageMenu,
	ReorderMenuSubmenu,
	SelectAllMenuItem,
	TLUiContextMenuProps,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useEditor,
	useShowCollaborationUi,
	useTools,
	useValue,
} from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'

// Mirrors DefaultContextMenuContent, with the comment item sharing the cursor chat group.
export function TlaEditorContextMenu(props: TLUiContextMenuProps) {
	const editor = useEditor()
	const showCollaborationUi = useShowCollaborationUi()
	// Same gate as the comment button in quick actions, so signed-out visitors get the entry too
	// and it prompts them to sign in.
	const commentingEnabled = useCommentingEnabled()
	const isSinglePageMode = useValue('isSinglePageMode', () => editor.options.maxPages <= 1, [
		editor,
	])
	return (
		<DefaultContextMenu {...props}>
			{(showCollaborationUi || commentingEnabled) && (
				<TldrawUiMenuGroup id="cursor-chat">
					{showCollaborationUi && <CursorChatItem />}
					{commentingEnabled && <CommentMenuItem />}
				</TldrawUiMenuGroup>
			)}
			<TldrawUiMenuGroup id="modify">
				<EditMenuSubmenu />
				<ArrangeMenuSubmenu />
				<ReorderMenuSubmenu />
				{!isSinglePageMode && <MoveToPageMenu />}
			</TldrawUiMenuGroup>
			<ClipboardMenuGroup />
			<ConversionsMenuGroup />
			<TldrawUiMenuGroup id="select-all">
				<SelectAllMenuItem />
			</TldrawUiMenuGroup>
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
