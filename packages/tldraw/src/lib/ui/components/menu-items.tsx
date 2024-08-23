import { TLPageId, useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../context/actions'
import { useUiEvents } from '../context/events'
import { useToasts } from '../context/toasts'
import {
	useAllowGroup,
	useAllowUngroup,
	useAnySelectedShapesCount,
	useCanFitFrameToContent,
	useCanFlattenToImage,
	useCanRemoveFrame,
	useHasLinkShapeSelected,
	useOneEmbedSelected,
	useOneEmbeddableBookmarkSelected,
	useOnlyFlippableShape,
	useShowAutoSizeToggle,
	useThreeStackableItems,
	useUnlockedSelectedShapesCount,
} from '../hooks/menu-hooks'
import { TldrawUiMenuActionCheckboxItem } from './primitives/menus/TldrawUiMenuActionCheckboxItem'
import { TldrawUiMenuActionItem } from './primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from './primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

/* -------------------- Selection ------------------- */
/** @public @react */
export function ToggleAutoSizeMenuItem() {
	const shouldDisplay = useShowAutoSizeToggle()
	if (!shouldDisplay) return null
	return <TldrawUiMenuActionItem actionId="toggle-auto-size" />
}
/** @public @react */
export function EditLinkMenuItem() {
	const shouldDisplay = useHasLinkShapeSelected()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem actionId="edit-link" />
}
/** @public @react */
export function DuplicateMenuItem() {
	const shouldDisplay = useUnlockedSelectedShapesCount(1)
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem actionId="duplicate" />
}
/** @public @react */
export function FlattenMenuItem() {
	const shouldDisplay = useCanFlattenToImage()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem actionId="flatten-to-image" />
}
/** @public @react */
export function GroupMenuItem() {
	const shouldDisplay = useAllowGroup()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem actionId="group" />
}
/** @public @react */
export function UngroupMenuItem() {
	const shouldDisplay = useAllowUngroup()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem actionId="ungroup" />
}
/** @public @react */
export function RemoveFrameMenuItem() {
	const shouldDisplay = useCanRemoveFrame()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem actionId="remove-frame" />
}
/** @public @react */
export function FitFrameToContentMenuItem() {
	const shouldDisplay = useCanFitFrameToContent()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem actionId="fit-frame-to-content" />
}
/** @public @react */
export function ToggleLockMenuItem() {
	const editor = useEditor()
	const shouldDisplay = useValue('selected shapes', () => editor.getSelectedShapes().length > 0, [
		editor,
	])
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem actionId="toggle-lock" />
}
/** @public @react */
export function ToggleTransparentBgMenuItem() {
	const editor = useEditor()
	const isTransparentBg = useValue(
		'isTransparentBg',
		() => !editor.getInstanceState().exportBackground,
		[editor]
	)
	return (
		<TldrawUiMenuActionCheckboxItem
			actionId="toggle-transparent"
			checked={isTransparentBg}
			toggle
		/>
	)
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
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.getCurrentPageShapeIds().size > 0,
		[editor]
	)

	return (
		<TldrawUiMenuSubmenu
			id="copy-as"
			label="context-menu.copy-as"
			size="small"
			disabled={!atLeastOneShapeOnPage}
		>
			<TldrawUiMenuGroup id="copy-as-group">
				<TldrawUiMenuActionItem actionId="copy-as-svg" />
				{Boolean(window.navigator.clipboard?.write) && (
					<TldrawUiMenuActionItem actionId="copy-as-png" />
				)}
				<TldrawUiMenuActionItem actionId="copy-as-json" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="copy-as-bg">
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
	const editor = useEditor()
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.getCurrentPageShapeIds().size > 0,
		[editor]
	)

	if (!atLeastOneShapeOnPage) return null

	return (
		<TldrawUiMenuGroup id="conversions">
			<CopyAsMenuGroup />
			<TldrawUiMenuSubmenu id="export-as" label="context-menu.export-as" size="small">
				<TldrawUiMenuGroup id="export-as-group">
					<TldrawUiMenuActionItem actionId="export-as-svg" />
					<TldrawUiMenuActionItem actionId="export-as-png" />
					<TldrawUiMenuActionItem actionId="export-as-json" />
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="export-as-bg">
					<ToggleTransparentBgMenuItem />
				</TldrawUiMenuGroup>
			</TldrawUiMenuSubmenu>
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
	if (!useAnySelectedShapesCount(1)) return null

	return (
		<TldrawUiMenuSubmenu id="edit" label="context-menu.edit" size="small">
			<GroupMenuItem />
			<UngroupMenuItem />
			<FlattenMenuItem />
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
	const oneSelected = useUnlockedSelectedShapesCount(1)
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

	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (!oneSelected) return null

	return (
		<TldrawUiMenuSubmenu id="move-to-page" label="context-menu.move-to-page" size="small">
			<TldrawUiMenuGroup id="pages">
				{pages.map((page) => (
					<TldrawUiMenuItem
						id={page.id}
						key={page.id}
						disabled={currentPageId === page.id}
						label={page.name}
						onSelect={() => {
							editor.markHistoryStoppingPoint('move_shapes_to_page')
							editor.moveShapesToPage(editor.getSelectedShapeIds(), page.id as TLPageId)

							const toPage = editor.getPage(page.id)

							if (toPage) {
								addToast({
									title: 'Changed Page',
									description: `Moved to ${toPage.name}.`,
									actions: [
										{
											label: 'Go Back',
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
	const oneEmbedSelected = useOneEmbedSelected()
	if (!oneEmbedSelected) return null
	return <TldrawUiMenuActionItem actionId="convert-to-bookmark" />
}

/** @public @react */
export function ConvertToEmbedMenuItem() {
	const oneEmbeddableBookmarkSelected = useOneEmbeddableBookmarkSelected()
	if (!oneEmbeddableBookmarkSelected) return null

	return <TldrawUiMenuActionItem actionId="convert-to-embed" />
}

/* ------------------- Preferences ------------------ */
/** @public @react */
export function ToggleSnapModeItem() {
	const editor = useEditor()
	const isSnapMode = useValue('isSnapMode', () => editor.user.getIsSnapMode(), [editor])
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-snap-mode" checked={isSnapMode} />
}
/** @public @react */
export function ToggleToolLockItem() {
	const editor = useEditor()
	const isToolLock = useValue('isToolLock', () => editor.getInstanceState().isToolLocked, [editor])
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-tool-lock" checked={isToolLock} />
}
/** @public @react */
export function ToggleGridItem() {
	const editor = useEditor()
	const isGridMode = useValue('isGridMode', () => editor.getInstanceState().isGridMode, [editor])
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-grid" checked={isGridMode} />
}

/** @public @react */
export function ToggleWrapModeItem() {
	const editor = useEditor()
	const isWrapMode = useValue('isWrapMode', () => editor.user.getIsWrapMode(), [editor])
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-wrap-mode" checked={isWrapMode} />
}

/** @public @react */
export function ToggleDarkModeItem() {
	const editor = useEditor()
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-dark-mode" checked={isDarkMode} />
}
/** @public @react */
export function ToggleFocusModeItem() {
	const editor = useEditor()
	const isFocusMode = useValue('isFocusMode', () => editor.getInstanceState().isFocusMode, [editor])
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-focus-mode" checked={isFocusMode} />
}
/** @public @react */
export function ToggleEdgeScrollingItem() {
	const editor = useEditor()
	const edgeScrollSpeed = useValue('edgeScrollSpeed', () => editor.user.getEdgeScrollSpeed(), [
		editor,
	])
	return (
		<TldrawUiMenuActionCheckboxItem
			actionId="toggle-edge-scrolling"
			checked={edgeScrollSpeed === 1}
		/>
	)
}
/** @public @react */
export function ToggleReduceMotionItem() {
	const editor = useEditor()
	const animationSpeed = useValue('animationSpeed', () => editor.user.getAnimationSpeed(), [editor])
	return (
		<TldrawUiMenuActionCheckboxItem
			actionId="toggle-reduce-motion"
			checked={animationSpeed === 0}
		/>
	)
}
/** @public @react */
export function ToggleDebugModeItem() {
	const editor = useEditor()
	const isDebugMode = useValue('isDebugMode', () => editor.getInstanceState().isDebugMode, [editor])
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-debug-mode" checked={isDebugMode} />
}

/** @public @react */
export function ToggleDynamicSizeModeItem() {
	const editor = useEditor()
	const isDynamicResizeMode = useValue(
		'dynamic resize',
		() => editor.user.getIsDynamicResizeMode(),
		[editor]
	)
	return (
		<TldrawUiMenuActionCheckboxItem
			actionId="toggle-dynamic-size-mode"
			checked={isDynamicResizeMode}
		/>
	)
}

/** @public @react */
export function TogglePasteAtCursorItem() {
	const editor = useEditor()
	const pasteAtCursor = useValue('paste at cursor', () => editor.user.getIsPasteAtCursorMode(), [
		editor,
	])
	return (
		<TldrawUiMenuActionCheckboxItem actionId="toggle-paste-at-cursor" checked={pasteAtCursor} />
	)
}

/* ---------------------- Print --------------------- */
/** @public @react */
export function PrintItem() {
	return <TldrawUiMenuActionItem actionId="print" />
}

/* ---------------------- Multiplayer --------------------- */
/** @public @react */
export function CursorChatItem() {
	const actions = useActions()
	const enabled = actions['open-cursor-chat']?.enabled?.()
	if (!enabled) return null
	return <TldrawUiMenuActionItem actionId="open-cursor-chat" />
}
