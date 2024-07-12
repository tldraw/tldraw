import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../context/actions'
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
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
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
			<HelpGroup />
		</>
	)
}

/** @public @react */
export function ExportFileContentSubMenu() {
	const actions = useActions()

	return (
		<TldrawUiMenuSubmenu id="export-all-as" label="context-menu.export-all-as" size="small">
			<TldrawUiMenuGroup id="export-all-as-group">
				<TldrawUiMenuItem {...actions['export-all-as-svg']} />
				<TldrawUiMenuItem {...actions['export-all-as-png']} />
				<TldrawUiMenuItem {...actions['export-all-as-json']} />
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

/** @public @react */
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

/** @public @react */
export function ExtrasGroup() {
	const actions = useActions()
	return (
		<TldrawUiMenuGroup id="extras">
			<TldrawUiMenuItem {...actions['insert-embed']} />
			<TldrawUiMenuItem {...actions['insert-media']} />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function HelpGroup() {
	function openUrl(url: string) {
		window.open(url, '_blank')
	}

	return (
		<TldrawUiMenuGroup id="help">
			<TldrawUiMenuSubmenu id="help" label="menu.help">
				<TldrawUiMenuGroup id="help-actions">
					<KeyboardShortcutsMenuItem />
					<TldrawUiMenuItem
						id="about"
						label="help-menu.docs"
						icon="external-link"
						readonlyOk
						onSelect={() => {
							openUrl('https://tldraw.dev')
						}}
					/>
				</TldrawUiMenuGroup>
			</TldrawUiMenuSubmenu>
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
				<TldrawUiMenuGroup id="language">
					<LanguageMenu />
				</TldrawUiMenuGroup>
			</TldrawUiMenuSubmenu>
		</TldrawUiMenuGroup>
	)
}
