import { useEditor, useValue } from '@tldraw/editor'
import {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	EditLinkMenuItem,
	EmbedsGroup,
	FitFrameToContentMenuItem,
	GroupMenuItem,
	MoveToPageMenu,
	RemoveFrameMenuItem,
	ReorderMenuSubmenu,
	SetSelectionGroup,
	ToggleAutoSizeMenuItem,
	ToggleLockMenuItem,
	UngroupMenuItem,
} from '../menu-items'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'

/** @public */
export function DefaultContextMenuContent() {
	const editor = useEditor()

	const selectToolActive = useValue(
		'isSelectToolActive',
		() => editor.getCurrentToolId() === 'select',
		[editor]
	)

	if (!selectToolActive) return null

	return (
		<>
			<TldrawUiMenuGroup id="selection">
				<ToggleAutoSizeMenuItem />
				<EditLinkMenuItem />
				<GroupMenuItem />
				<UngroupMenuItem />
				<RemoveFrameMenuItem />
				<FitFrameToContentMenuItem />
				<ToggleLockMenuItem />
			</TldrawUiMenuGroup>
			<EmbedsGroup />
			<TldrawUiMenuGroup id="modify">
				<ArrangeMenuSubmenu />
				<ReorderMenuSubmenu />
				<MoveToPageMenu />
			</TldrawUiMenuGroup>
			<ClipboardMenuGroup />
			<ConversionsMenuGroup />
			<SetSelectionGroup />
		</>
	)
}
