import { useEditor, useValue } from '@tldraw/editor'
import { useShowCollaborationUi } from '../../hooks/useCollaborationStatus'
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

/** @public @react */
export function DefaultContextMenuContent() {
	const editor = useEditor()
	const showCollaborationUi = useShowCollaborationUi()

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
			{showCollaborationUi && <CursorChatItem />}
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
