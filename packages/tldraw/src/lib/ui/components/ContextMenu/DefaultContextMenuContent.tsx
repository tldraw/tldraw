import { useEditor, useValue } from '@tldraw/editor'
import { useShowCollaborationUi } from '../../hooks/useIsMultiplayer'
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

	const selectToolActive = useValue(
		'isSelectToolActive',
		() => editor.getCurrentToolId() === 'select',
		[editor]
	)

	if (!selectToolActive) return null

	return (
		<>
			{showCollaborationUi && <CursorChatItem />}
			<TldrawUiMenuGroup id="modify">
				<EditMenuSubmenu />
				<ArrangeMenuSubmenu />
				<ReorderMenuSubmenu />
				<MoveToPageMenu />
			</TldrawUiMenuGroup>
			<ClipboardMenuGroup />
			<ConversionsMenuGroup />
			<TldrawUiMenuGroup id="select-all">
				<SelectAllMenuItem />
			</TldrawUiMenuGroup>
		</>
	)
}
