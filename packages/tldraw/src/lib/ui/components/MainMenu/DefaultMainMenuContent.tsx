import { useCanRedo, useCanUndo } from '../../hooks/menu-hooks'
import { AccessibilityMenu } from '../AccessibilityMenu'
import { ColorSchemeMenu } from '../ColorSchemeMenu'
import { KeyboardShortcutsMenuItem } from '../HelpMenu/DefaultHelpMenuContent'
import { InputModeMenu } from '../InputModeMenu'
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
			<TldrawUiMenuGroup id="basic">
				<EditSubmenu />
				<ViewSubmenu />
				<ExportFileContentSubMenu />
				<ExtrasGroup />
			</TldrawUiMenuGroup>
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
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="export-all-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function EditSubmenu() {
	return (
		<TldrawUiMenuSubmenu id="edit" label="menu.edit">
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
		<>
			<TldrawUiMenuActionItem actionId="insert-embed" />
			<TldrawUiMenuActionItem actionId="insert-media" />
		</>
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
					<ToggleDynamicSizeModeItem />
					<TogglePasteAtCursorItem />
					<ToggleDebugModeItem />
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="user-interface-submenus">
					<InputModeMenu />
					<ColorSchemeMenu />
					<AccessibilityMenu />
				</TldrawUiMenuGroup>
			</TldrawUiMenuSubmenu>
			<LanguageMenu />
			<KeyboardShortcutsMenuItem />
		</TldrawUiMenuGroup>
	)
}
