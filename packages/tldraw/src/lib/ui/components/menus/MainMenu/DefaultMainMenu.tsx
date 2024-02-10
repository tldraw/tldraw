import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../../hooks/useActions'
import { useCanRedo } from '../../../hooks/useCanRedo'
import { useCanUndo } from '../../../hooks/useCanUndo'
import { LanguageMenu } from '../../LanguageMenu'
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
	ToggleDarkModeItem,
	ToggleDebugModeItem,
	ToggleEdgeScrollingItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	ToggleLockMenuItem,
	ToggleReduceMotionItem,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	UngroupMenuItem,
	UnlockAllMenuItem,
	ZoomTo100MenuItem,
	ZoomToFitMenuItem,
	ZoomToSelectionMenuItem,
} from '../MenuItems/MenuItems'
import { TldrawUiMenuGroup } from '../MenuItems/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../MenuItems/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../MenuItems/TldrawUiMenuSubmenu'

/** @public */
export function DefaultMainMenu() {
	return (
		<>
			<EditSubmenu />
			<ViewSubmenu />
			<ExtrasGroup />
			<PreferencesGroup />
		</>
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

function ViewSubmenu() {
	const actions = useActions()
	return (
		<TldrawUiMenuSubmenu id="view" label="menu.view">
			<TldrawUiMenuGroup id="view-actions">
				<TldrawUiMenuItem {...actions['zoom-in']} />
				<TldrawUiMenuItem {...actions['zoom-out']} />
				<ZoomTo100MenuItem />
				<ZoomToFitMenuItem />
				<ZoomToSelectionMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

function ExtrasGroup() {
	const actions = useActions()
	return (
		<TldrawUiMenuGroup id="extras">
			<TldrawUiMenuItem {...actions['insert-embed']} />
			<TldrawUiMenuItem {...actions['insert-media']} />
		</TldrawUiMenuGroup>
	)
}

/* ------------------- Preferences ------------------ */

function PreferencesGroup() {
	return (
		<TldrawUiMenuGroup id="preferences">
			<TldrawUiMenuSubmenu id="preferences" label="menu.preferences">
				<TldrawUiMenuGroup id="preferences-actions">
					<ToggleSnapModeItem />
					<ToggleToolLockItem />
					<ToggleGridItem />
					<ToggleDarkModeItem />
					<ToggleFocusModeItem />
					<ToggleEdgeScrollingItem />
					<ToggleReduceMotionItem />
					<ToggleDebugModeItem />
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="language">
					<LanguageMenu />
				</TldrawUiMenuGroup>
			</TldrawUiMenuSubmenu>
		</TldrawUiMenuGroup>
	)
}
