import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../context/actions'
import {
	NEW_PROJECT_ACTION,
	OPEN_FILE_ACTION,
	SAVE_FILE_COPY_ACTION,
} from '../../context/useFileSystem'
import { useCanRedo, useCanUndo } from '../../hooks/menu-hooks'
import { LanguageMenu } from '../LanguageMenu'
import {
	ClipboardMenuGroup,
	ConversionsMenuGroup,
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
	ToggleTransparentBgMenuItem,
	UngroupMenuItem,
	UnlockAllMenuItem,
	ZoomTo100MenuItem,
	ZoomToFitMenuItem,
	ZoomToSelectionMenuItem,
} from '../menu-items'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'

/** @public */
export function DefaultMainMenuContent() {
	return (
		<>
			<FileSubmenu />
			<EditSubmenu />
			<ObjectSubmenu />
			<ViewSubmenu />
			<ExtrasGroup />
			<PreferencesGroup />
		</>
	)
}

/** @public */
export function FileSubmenu() {
	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<DefaultMainMenuFileContent />
		</TldrawUiMenuSubmenu>
	)
}

/** @public */
export function DefaultMainMenuFileContent() {
	const actions = useActions()

	return (
		<TldrawUiMenuGroup id="file-actions">
			<TldrawUiMenuItem {...actions[NEW_PROJECT_ACTION]} />
			<TldrawUiMenuItem {...actions[OPEN_FILE_ACTION]} />
			<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
			<ExportFileContentSubMenu />
		</TldrawUiMenuGroup>
	)
}

/** @public */
export function ExportFileContentSubMenu() {
	const actions = useActions()

	return (
		<TldrawUiMenuSubmenu id="export-as" label="context-menu.export-as" size="small">
			<TldrawUiMenuGroup id="export-as-group">
				<TldrawUiMenuItem {...actions['export-as-svg']} />
				<TldrawUiMenuItem {...actions['export-as-png']} />
				<TldrawUiMenuItem {...actions['export-as-json']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="export-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public */
export function EditSubmenu() {
	const editor = useEditor()

	const selectToolActive = useValue(
		'isSelectToolActive',
		() => editor.getCurrentToolId() === 'select',
		[editor]
	)

	return (
		<TldrawUiMenuSubmenu id="edit" label="menu.edit" disabled={!selectToolActive}>
			<UndoRedoGroup />
			<ClipboardMenuGroup />
			<SetSelectionGroup />
		</TldrawUiMenuSubmenu>
	)
}

/** @public */
export function ObjectSubmenu() {
	const editor = useEditor()

	const selectToolActive = useValue(
		'isSelectToolActive',
		() => editor.getCurrentToolId() === 'select',
		[editor]
	)

	return (
		<TldrawUiMenuSubmenu id="object" label="menu.object" disabled={!selectToolActive}>
			<ConversionsMenuGroup />
			<MultiShapeMenuGroup />
			<MiscMenuGroup />
			<EmbedsGroup />
			<LockGroup />
		</TldrawUiMenuSubmenu>
	)
}

/** @public */
export function MiscMenuGroup() {
	return (
		<TldrawUiMenuGroup id="misc">
			<ToggleAutoSizeMenuItem />
			<EditLinkMenuItem />
		</TldrawUiMenuGroup>
	)
}

/** @public */
export function LockGroup() {
	return (
		<TldrawUiMenuGroup id="lock">
			<ToggleLockMenuItem />
			<UnlockAllMenuItem />
		</TldrawUiMenuGroup>
	)
}

/** @public */
export function MultiShapeMenuGroup() {
	return (
		<TldrawUiMenuGroup id="multi-shape">
			<GroupMenuItem />
			<UngroupMenuItem />
			<RemoveFrameMenuItem />
			<FitFrameToContentMenuItem />
		</TldrawUiMenuGroup>
	)
}

/** @public */
export function UndoRedoGroup() {
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

/** @public */
export function ViewSubmenu() {
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

/** @public */
export function ExtrasGroup() {
	const actions = useActions()
	return (
		<TldrawUiMenuGroup id="extras">
			<TldrawUiMenuItem {...actions['insert-embed']} />
			<TldrawUiMenuItem {...actions['insert-media']} />
		</TldrawUiMenuGroup>
	)
}

/* ------------------- Preferences ------------------ */

/** @public */
export function PreferencesGroup() {
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
