import { useEditor, useValue } from '@tldraw/editor'
import {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	ConvertToBookmarkMenuItem,
	ConvertToEmbedMenuItem,
	EditLinkMenuItem,
	FitFrameToContentMenuItem,
	GroupMenuItem,
	MoveToPageMenu,
	RemoveFrameMenuItem,
	ReorderMenuSubmenu,
	SelectAllMenuItem,
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
			<TldrawUiMenuGroup id="misc">
				<GroupMenuItem />
				<UngroupMenuItem />
				<EditLinkMenuItem />
				<ToggleAutoSizeMenuItem />
				<RemoveFrameMenuItem />
				<FitFrameToContentMenuItem />
				<ConvertToEmbedMenuItem />
				<ConvertToBookmarkMenuItem />
				<ToggleLockMenuItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="modify">
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
