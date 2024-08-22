import { useEditor, useValue } from '@tldraw/editor'
import { useCanRedo, useCanUndo } from '../../hooks/menu-hooks'
import { ColorSchemeMenu } from '../ColorSchemeMenu'
import { KeyboardShortcutsMenuItem } from '../HelpMenu/DefaultHelpMenuContent'
import { LanguageMenu } from '../LanguageMenu'
import {
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	ConvertToBookmarkMenuItem,
	ConvertToEmbedMenuItem,
	EditLinkMenuItem,
	FitFrameToContentMenuItem,
	FlattenMenuItem,
	GroupMenuItem,
	RemoveFrameMenuItem,
	SelectAllMenuItem,
	ToggleAutoSizeMenuItem,
	ToggleDebugModeItem,
	ToggleDynamicSizeModeItem,
	ToggleEdgeScrollingItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	ToggleLockMenuItem,
	TogglePasteAtCursorItem,
	ToggleReduceMotionItem,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	ToggleTransparentBgMenuItem,
	ToggleWrapModeItem,
	UngroupMenuItem,
	UnlockAllMenuItem,
	ZoomTo100MenuItem,
	ZoomToFitMenuItem,
	ZoomToSelectionMenuItem,
} from '../menu-items'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'

/** @public @react */
export function DefaultMainMenuContent() {
	return (
		<>
			<EditSubmenu />
			<ViewSubmenu />
			<ExportFileContentSubMenu />
			<ExtrasGroup />
			<PreferencesGroup />
		</>
	)
}

/** @public @react */
export function ExportFileContentSubMenu() {
	return (
		<TldrawUiMenuSubmenu id="export-all-as" label="context-menu.export-all-as" size="small">
			<TldrawUiMenuGroup id="export-all-as-group">
				<TldrawUiMenuActionItem actionId="export-all-as-svg" />
				<TldrawUiMenuActionItem actionId="export-all-as-png" />
				<TldrawUiMenuActionItem actionId="export-all-as-json" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="export-all-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
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
			<ConversionsMenuGroup />
			<MiscMenuGroup />
			<LockGroup />
			<TldrawUiMenuGroup id="select-all">
				<SelectAllMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function MiscMenuGroup() {
	return (
		<TldrawUiMenuGroup id="misc">
			<GroupMenuItem />
			<UngroupMenuItem />
			<EditLinkMenuItem />
			<ToggleAutoSizeMenuItem />
			<RemoveFrameMenuItem />
			<FitFrameToContentMenuItem />
			<ConvertToEmbedMenuItem />
			<ConvertToBookmarkMenuItem />
			<FlattenMenuItem />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function LockGroup() {
	return (
		<TldrawUiMenuGroup id="lock">
			<ToggleLockMenuItem />
			<UnlockAllMenuItem />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function UndoRedoGroup() {
	const canUndo = useCanUndo()
	const canRedo = useCanRedo()
	return (
		<TldrawUiMenuGroup id="undo-redo">
			<TldrawUiMenuActionItem actionId="undo" disabled={!canUndo} />
			<TldrawUiMenuActionItem actionId="redo" disabled={!canRedo} />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function ViewSubmenu() {
	return (
		<TldrawUiMenuSubmenu id="view" label="menu.view">
			<TldrawUiMenuGroup id="view-actions">
				<TldrawUiMenuActionItem actionId="zoom-in" />
				<TldrawUiMenuActionItem actionId="zoom-out" />
				<ZoomTo100MenuItem />
				<ZoomToFitMenuItem />
				<ZoomToSelectionMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function ExtrasGroup() {
	return (
		<TldrawUiMenuGroup id="extras">
			<TldrawUiMenuActionItem actionId="insert-embed" />
			<TldrawUiMenuActionItem actionId="insert-media" />
		</TldrawUiMenuGroup>
	)
}

/* ------------------- Preferences ------------------ */

/** @public @react */
export function PreferencesGroup() {
	return (
		<TldrawUiMenuGroup id="preferences">
			<TldrawUiMenuSubmenu id="preferences" label="menu.preferences">
				<TldrawUiMenuGroup id="preferences-actions">
					<ToggleSnapModeItem />
					<ToggleToolLockItem />
					<ToggleGridItem />
					<ToggleWrapModeItem />
					<ToggleFocusModeItem />
					<ToggleEdgeScrollingItem />
					<ToggleReduceMotionItem />
					<ToggleDynamicSizeModeItem />
					<TogglePasteAtCursorItem />
					<ToggleDebugModeItem />
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="color-scheme">
					<ColorSchemeMenu />
				</TldrawUiMenuGroup>
			</TldrawUiMenuSubmenu>
			<LanguageMenu />
			<KeyboardShortcutsMenuItem />
		</TldrawUiMenuGroup>
	)
}
