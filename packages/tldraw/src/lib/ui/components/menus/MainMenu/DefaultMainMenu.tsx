import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../../hooks/useActions'
import { useCanRedo } from '../../../hooks/useCanRedo'
import { useCanUndo } from '../../../hooks/useCanUndo'
import {
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	DeleteGroup,
	DuplicateMenuItem,
	EditLinkMenuItem,
	EmbedsGroup,
	FitFrameToContentMenuItem,
	GroupMenuItem,
	RemoveFrameMenuItem,
	SetSelectionGroup,
	ToggleAutoSizeMenuItem,
	ToggleLockMenuItem,
	UngroupMenuItem,
	UnlockAllMenuItem,
} from '../MenuItems/MenuItems'
import { TldrawUiMenuGroup } from '../MenuItems/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../MenuItems/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../MenuItems/TldrawUiMenuSubmenu'

/** @public */
export function DefaultMainMenu() {
	return (
		<>
			<MenuGroup />
		</>
	)
}

function MenuGroup() {
	return (
		<TldrawUiMenuGroup id="menu">
			<FileSubmenu />
			<EditSubmenu />
		</TldrawUiMenuGroup>
	)
}

function FileSubmenu() {
	const editor = useEditor()
	const actions = useActions()
	const emptyPage = useValue('emptyPage', () => editor.getCurrentPageShapeIds().size === 0, [
		editor,
	])
	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<TldrawUiMenuGroup id="print">
				<TldrawUiMenuItem {...actions['print']} disabled={emptyPage} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

function EditSubmenu() {
	const editor = useEditor()

	const selectToolActive = useValue(
		'isSelectToolActive',
		() => editor.getCurrentToolId() === 'select',
		[editor]
	)

	if (!selectToolActive) return null

	return (
		<TldrawUiMenuSubmenu id="edit" label="menu.edit">
			<UndoRedoGroup />
			<ClipboardMenuGroup />
			<ConversionsMenuGroup />
			<SetSelectionGroup />
			<SelectionMenuGroup />
			<EmbedsGroup />
			<DeleteGroup />
		</TldrawUiMenuSubmenu>
	)
}

function SelectionMenuGroup() {
	return (
		<TldrawUiMenuGroup id="selection">
			<ToggleAutoSizeMenuItem />
			<EditLinkMenuItem />
			<DuplicateMenuItem />
			<GroupMenuItem />
			<UngroupMenuItem />
			<RemoveFrameMenuItem />
			<FitFrameToContentMenuItem />
			<ToggleLockMenuItem />
			<UnlockAllMenuItem />
		</TldrawUiMenuGroup>
	)
}

function UndoRedoGroup() {
	const actions = useActions()
	const canUndo = useCanUndo()
	const canRedo = useCanRedo()
	return (
		<TldrawUiMenuGroup id="undo-redo">
			<TldrawUiMenuItem {...actions['undo']} disabled={!canUndo} />
			<TldrawUiMenuItem {...actions['redo']} disabled={!canRedo} />
		</TldrawUiMenuGroup>
	)
}
