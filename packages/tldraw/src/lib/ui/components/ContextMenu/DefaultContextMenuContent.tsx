import { useEditor, useValue } from '@tldraw/editor'
import { useShowCollaborationUi } from '../../hooks/useCollaborationStatus'
import { useCommentingEnabled } from '../../hooks/useCommentingEnabled'
import { useTools } from '../../hooks/useTools'
import {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	CursorChatItem,
	EditMenuSubmenu,
	MoveToPageMenu,
	ReorderMenuSubmenu,
	SelectAllMenuItem,
} from '../menu-items'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public @react */
export function DefaultContextMenuContent() {
	const editor = useEditor()
	const showCollaborationUi = useShowCollaborationUi()
	const commentingEnabled = useCommentingEnabled()

	const isSinglePageMode = useValue('isSinglePageMode', () => editor.options.maxPages <= 1, [
		editor,
	])

	// Note: we intentionally don't bail out for non-select tools. Each submenu
	// below self-hides when it has nothing to offer (no selection, no shapes,
	// readonly), so the menu carries the right items in any tool — e.g. Paste
	// and Select all after a touch long-press while a shape tool is active.
	// (Closes #8828.)

	return (
		<>
			{(showCollaborationUi || commentingEnabled) && (
				<TldrawUiMenuGroup id="cursor-chat">
					{commentingEnabled && <CommentMenuItem />}
					{showCollaborationUi && <CursorChatItem />}
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
		</>
	)
}

function CommentMenuItem() {
	const commentTool = useTools().comment
	if (!commentTool) return null
	// `c` enters the tool rather than opening a composer at the menu's point, so don't advertise it.
	return <TldrawUiMenuItem {...commentTool} kbd={undefined} />
}
