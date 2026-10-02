import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../context/actions'
import { useUiEvents } from '../context/events'
import { useToasts } from '../context/toasts'
import {
	useAnySelectedShapesCount,
	useHasShapesOnPage,
	useOnlyFlippableShape,
	useThreeStackableItems,
	useUnlockedSelectedShapesCount,
} from '../hooks/menu-hooks'
import { useReadonly } from '../hooks/useReadonly'
import { TldrawUiMenuActionCheckboxItem } from './primitives/menus/TldrawUiMenuActionCheckboxItem'
import { TldrawUiMenuActionItem } from './primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from './primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

/* -------------------- Selection ------------------- */

/** @public @react */
export function ToggleAutoSizeMenuItem() {
	return <TldrawUiMenuActionItem actionId="toggle-auto-size" whenDisabled="hide" />
}

/** @public @react */
export function EditLinkMenuItem() {
	return <TldrawUiMenuActionItem actionId="edit-link" whenDisabled="hide" />
}

/** @public @react */
export function DuplicateMenuItem() {
	return <TldrawUiMenuActionItem actionId="duplicate" whenDisabled="hide" />
}

/** @public @react */
export function FlattenMenuItem() {
	return <TldrawUiMenuActionItem actionId="flatten-to-image" whenDisabled="hide" />
}

/** @public @react */
export function DownloadOriginalMenuItem() {
	return <TldrawUiMenuActionItem actionId="download-original" whenDisabled="hide" />
}

/** @public @react */
export function GroupMenuItem() {
	return <TldrawUiMenuActionItem actionId="group" whenDisabled="hide" />
}

/** @public @react */
export function UngroupMenuItem() {
	return <TldrawUiMenuActionItem actionId="ungroup" whenDisabled="hide" />
}

/** @public @react */
export function FrameSelectionMenuItem() {
	return <TldrawUiMenuActionItem actionId="frame-selection" whenDisabled="hide" />
}

/** @public @react */
export function RemoveFrameMenuItem() {
	return <TldrawUiMenuActionItem actionId="remove-frame" whenDisabled="hide" />
}

/** @public @react */
export function FitFrameToContentMenuItem() {
	return <TldrawUiMenuActionItem actionId="fit-frame-to-content" whenDisabled="hide" />
}

/** @public @react */
export function ToggleLockMenuItem() {
	return <TldrawUiMenuActionItem actionId="toggle-lock" whenDisabled="hide" />
}

/** @public @react */
export function ToggleTransparentBgMenuItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-transparent" toggle />
}

/** @public @react */
export function UnlockAllMenuItem() {
	return <TldrawUiMenuActionItem actionId="unlock-all" />
}

/* ---------------------- Zoom ---------------------- */

/** @public @react */
export function ZoomTo100MenuItem() {
	return <TldrawUiMenuActionItem actionId="zoom-to-100" noClose />
}

/** @public @react */
export function ZoomToFitMenuItem() {
	return (
		<TldrawUiMenuActionItem
			actionId="zoom-to-fit"
			data-testid="minimap.zoom-menu.zoom-to-fit"
			noClose
		/>
	)
}

/** @public @react */
export function ZoomToSelectionMenuItem() {
	return (
		<TldrawUiMenuActionItem
			actionId="zoom-to-selection"
			data-testid="minimap.zoom-menu.zoom-to-selection"
			noClose
		/>
	)
}

/* -------------------- Clipboard ------------------- */

/** @public @react */
export function ClipboardMenuGroup() {
	return (
		<TldrawUiMenuGroup id="clipboard">
			<CutMenuItem />
			<CopyMenuItem />
			<PasteMenuItem />
			<DuplicateMenuItem />
			<DeleteMenuItem />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CopyAsMenuGroup() {
	const editor = useEditor()
	const actions = useActions()
	const atLeastOneShapeOnPage = useHasShapesOnPage()
	const isDebugMode = useValue('isDebugMode', () => editor.getInstanceState().isDebugMode, [editor])

	const showCopyAsJson = !!actions['copy-as-json'] && isDebugMode
	if (!actions['copy-as-svg'] && !actions['copy-as-png'] && !showCopyAsJson) return null

	return (
		<TldrawUiMenuSubmenu
			id="copy-as"
			label="context-menu.copy-as"
			size="small"
			disabled={!atLeastOneShapeOnPage}
		>
			<TldrawUiMenuGroup id="copy-as-group">
				<TldrawUiMenuActionItem actionId="copy-as-svg" />
				<TldrawUiMenuActionItem actionId="copy-as-png" whenDisabled="hide" />
				<TldrawUiMenuActionItem actionId="copy-as-json" whenDisabled="hide" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="copy-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function ExportAsMenuGroup() {
	const actions = useActions()

	// If a consumer has removed the export actions via `overrides`, don't render an empty submenu.
	if (!actions['export-as-svg'] && !actions['export-as-png']) return null

	return (
		<TldrawUiMenuSubmenu id="export-as" label="context-menu.export-as" size="small">
			<TldrawUiMenuGroup id="export-as-group">
				<TldrawUiMenuActionItem actionId="export-as-svg" />
				<TldrawUiMenuActionItem actionId="export-as-png" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="export-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function CutMenuItem() {
	return <TldrawUiMenuActionItem actionId="cut" />
}

/** @public @react */
export function CopyMenuItem() {
	return <TldrawUiMenuActionItem actionId="copy" />
}

/** @public @react */
export function PasteMenuItem() {
	return <TldrawUiMenuActionItem actionId="paste" />
}

/* ------------------- Conversions ------------------ */

/** @public @react */
export function ConversionsMenuGroup() {
	const atLeastOneShapeOnPage = useHasShapesOnPage()

	if (!atLeastOneShapeOnPage) return null

	return (
		<TldrawUiMenuGroup id="conversions">
			<CopyAsMenuGroup />
			<ExportAsMenuGroup />
			<DownloadOriginalMenuItem />
		</TldrawUiMenuGroup>
	)
}

/* ------------------ Set Selection ----------------- */
/** @public @react */
export function SelectAllMenuItem() {
	return <TldrawUiMenuActionItem actionId="select-all" />
}

/* ------------------ Delete Group ------------------ */

/** @public @react */
export function DeleteMenuItem() {
	return <TldrawUiMenuActionItem actionId="delete" />
}

/* --------------------- Modify --------------------- */

/** @public @react */
export function EditMenuSubmenu() {
	const isReadonlyMode = useReadonly()
	if (!useAnySelectedShapesCount(1)) return null
	if (isReadonlyMode) return null

	return (
		<TldrawUiMenuSubmenu id="edit" label="context-menu.edit" size="small">
			<GroupMenuItem />
			<UngroupMenuItem />
			<FlattenMenuItem />
			<FrameSelectionMenuItem />
			<EditLinkMenuItem />
			<FitFrameToContentMenuItem />
			<RemoveFrameMenuItem />
			<ConvertToEmbedMenuItem />
			<ConvertToBookmarkMenuItem />
			<ToggleAutoSizeMenuItem />
			<ToggleLockMenuItem />
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function ArrangeMenuSubmenu() {
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const onlyFlippableShapeSelected = useOnlyFlippableShape()
	const isReadonlyMode = useReadonly()

	if (isReadonlyMode) return null
	if (!(twoSelected || onlyFlippableShapeSelected)) return null

	return (
		<TldrawUiMenuSubmenu id="arrange" label="context-menu.arrange" size="small">
			{twoSelected && (
				<TldrawUiMenuGroup id="align">
					<TldrawUiMenuActionItem actionId="align-left" />
					<TldrawUiMenuActionItem actionId="align-center-horizontal" />
					<TldrawUiMenuActionItem actionId="align-right" />
					<TldrawUiMenuActionItem actionId="align-top" />
					<TldrawUiMenuActionItem actionId="align-center-vertical" />
					<TldrawUiMenuActionItem actionId="align-bottom" />
				</TldrawUiMenuGroup>
			)}
			<DistributeMenuGroup />
			{twoSelected && (
				<TldrawUiMenuGroup id="stretch">
					<TldrawUiMenuActionItem actionId="stretch-horizontal" />
					<TldrawUiMenuActionItem actionId="stretch-vertical" />
				</TldrawUiMenuGroup>
			)}
			{(twoSelected || onlyFlippableShapeSelected) && (
				<TldrawUiMenuGroup id="flip">
					<TldrawUiMenuActionItem actionId="flip-horizontal" />
					<TldrawUiMenuActionItem actionId="flip-vertical" />
				</TldrawUiMenuGroup>
			)}
			<OrderMenuGroup />
		</TldrawUiMenuSubmenu>
	)
}

function DistributeMenuGroup() {
	const threeSelected = useUnlockedSelectedShapesCount(3)
	if (!threeSelected) return null

	return (
		<TldrawUiMenuGroup id="distribute">
			<TldrawUiMenuActionItem actionId="distribute-horizontal" />
			<TldrawUiMenuActionItem actionId="distribute-vertical" />
		</TldrawUiMenuGroup>
	)
}

function OrderMenuGroup() {
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const threeStackableItems = useThreeStackableItems()
	if (!twoSelected) return null

	return (
		<TldrawUiMenuGroup id="order">
			<TldrawUiMenuActionItem actionId="pack" />
			{threeStackableItems && <TldrawUiMenuActionItem actionId="stack-horizontal" />}
			{threeStackableItems && <TldrawUiMenuActionItem actionId="stack-vertical" />}
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function ReorderMenuSubmenu() {
	const isReadonlyMode = useReadonly()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (isReadonlyMode) return null
	if (!oneSelected) return null

	return (
		<TldrawUiMenuSubmenu id="reorder" label="context-menu.reorder" size="small">
			<TldrawUiMenuGroup id="reorder">
				<TldrawUiMenuActionItem actionId="bring-to-front" />
				<TldrawUiMenuActionItem actionId="bring-forward" />
				<TldrawUiMenuActionItem actionId="send-backward" />
				<TldrawUiMenuActionItem actionId="send-to-back" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function MoveToPageMenu() {
	const editor = useEditor()
	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])
	const { addToast } = useToasts()
	const trackEvent = useUiEvents()
	const isReadonlyMode = useReadonly()
	const oneSelected = useUnlockedSelectedShapesCount(1)

	if (!oneSelected) return null
	if (isReadonlyMode) return null

	return (
		<TldrawUiMenuSubmenu id="move-to-page" label="context-menu.move-to-page" size="small">
			<TldrawUiMenuGroup id="pages">
				{pages.map((page) => (
					<TldrawUiMenuItem
						id={page.id}
						key={page.id}
						disabled={currentPageId === page.id}
						label={page.name.length > 30 ? `${page.name.slice(0, 30)}…` : page.name}
						onSelect={() => {
							editor.markHistoryStoppingPoint('move_shapes_to_page')
							editor.moveShapesToPage(editor.getSelectedShapeIds(), page.id)

							const toPage = editor.getPage(page.id)

							if (toPage) {
								addToast({
									title: 'Changed page',
									description: `Moved to ${toPage.name}.`,
									actions: [
										{
											label: 'Go back',
											type: 'primary',
											onClick: () => {
												editor.markHistoryStoppingPoint('change-page')
												editor.setCurrentPage(currentPageId)
											},
										},
									],
								})
							}
							trackEvent('move-to-page', { source: 'context-menu' })
						}}
					/>
				))}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="new-page">
				<TldrawUiMenuActionItem actionId="move-to-new-page" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function ConvertToBookmarkMenuItem() {
	return <TldrawUiMenuActionItem actionId="convert-to-bookmark" whenDisabled="hide" />
}

/** @public @react */
export function ConvertToEmbedMenuItem() {
	return <TldrawUiMenuActionItem actionId="convert-to-embed" whenDisabled="hide" />
}

/* ------------------- Preferences ------------------ */

/** @public @react */
export function ToggleSnapModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-snap-mode" />
}

/** @public @react */
export function ToggleToolLockItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-tool-lock" />
}

/** @public @react */
export function ToggleGridItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-grid" />
}

/** @public @react */
export function ToggleWrapModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-wrap-mode" />
}

/** @public @react */
export function ToggleDarkModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-dark-mode" />
}

/** @public @react */
export function ToggleFocusModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-focus-mode" />
}

/** @public @react */
export function ToggleEdgeScrollingItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-edge-scrolling" />
}

/** @public @react */
export function ToggleInvertZoomItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-invert-zoom" />
}

/** @public @react */
export function ToggleReduceMotionItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-reduce-motion" />
}

/** @public @react */
export function ToggleKeyboardShortcutsItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-keyboard-shortcuts" />
}

/** @public @react */
export function ToggleEnhancedA11yModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="enhanced-a11y-mode" />
}

/** @public @react */
export function ToggleDebugModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-debug-mode" />
}

/** @public @react */
export function ToggleDynamicSizeModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-dynamic-size-mode" />
}

/** @public @react */
export function TogglePasteAtCursorItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-paste-at-cursor" />
}

/* ---------------------- Print --------------------- */

/** @public @react */
export function PrintItem() {
	return <TldrawUiMenuActionItem actionId="print" />
}

/* ---------------------- Multiplayer --------------------- */

/** @public @react */
export function CursorChatItem() {
	return <TldrawUiMenuActionItem actionId="open-cursor-chat" whenDisabled="hide" />
}
