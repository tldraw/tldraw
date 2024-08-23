import { useEditor, useValue } from '@tldraw/editor'
import { useIsSinglePageMode } from '../../hooks/menu-hooks'
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
	const isSinglePageMode = useIsSinglePageMode()

	if (!selectToolActive) return null

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
