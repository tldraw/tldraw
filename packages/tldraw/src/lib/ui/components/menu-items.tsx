import {
	TLBookmarkShape,
	TLEmbedShape,
	TLFrameShape,
	TLImageShape,
	TLPageId,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { getEmbedInfo } from '../../utils/embeds/embeds'
import { useUiEvents } from '../context/events'
import { useToasts } from '../context/toasts'
import {
	showMenuPaste,
	useAllowGroup,
	useAllowUngroup,
	useAnySelectedShapesCount,
	useHasLinkShapeSelected,
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
	return <TldrawUiMenuActionItem action="toggle-auto-size" />
}
/** @public @react */
export function EditLinkMenuItem() {
	const shouldDisplay = useHasLinkShapeSelected()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem action="edit-link" />
}
/** @public @react */
export function DuplicateMenuItem() {
	const shouldDisplay = useUnlockedSelectedShapesCount(1)
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem action="duplicate" />
}
/** @public @react */
export function FlattenMenuItem() {
	const editor = useEditor()
	const shouldDisplay = useValue(
		'should display flatten option',
		() => {
			const selectedShapeIds = editor.getSelectedShapeIds()
			if (selectedShapeIds.length === 0) return false
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (onlySelectedShape && editor.isShapeOfType<TLImageShape>(onlySelectedShape, 'image')) {
				return false
			}
			return true
		},
		[editor]
	)
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem action="flatten-to-image" />
}
/** @public @react */
export function GroupMenuItem() {
	const shouldDisplay = useAllowGroup()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem action="group" />
}
/** @public @react */
export function UngroupMenuItem() {
	const shouldDisplay = useAllowUngroup()
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem action="ungroup" />
}
/** @public @react */
export function RemoveFrameMenuItem() {
	const editor = useEditor()
	const shouldDisplay = useValue(
		'allow unframe',
		() => {
			const selectedShapes = editor.getSelectedShapes()
			if (selectedShapes.length === 0) return false
			return selectedShapes.every((shape) => editor.isShapeOfType<TLFrameShape>(shape, 'frame'))
		},
		[editor]
	)
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem action="remove-frame" />
}
/** @public @react */
export function FitFrameToContentMenuItem() {
	const editor = useEditor()
	const shouldDisplay = useValue(
		'allow fit frame to content',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false
			return (
				editor.isShapeOfType<TLFrameShape>(onlySelectedShape, 'frame') &&
				editor.getSortedChildIdsForParent(onlySelectedShape).length > 0
			)
		},
		[editor]
	)
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem action="fit-frame-to-content" />
}
/** @public @react */
export function ToggleLockMenuItem() {
	const editor = useEditor()
	const shouldDisplay = useValue('selected shapes', () => editor.getSelectedShapes().length > 0, [
		editor,
	])
	if (!shouldDisplay) return null

	return <TldrawUiMenuActionItem action="toggle-lock" />
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
		<TldrawUiMenuActionCheckboxItem action="toggle-transparent" checked={isTransparentBg} toggle />
	)
}
/** @public @react */
export function UnlockAllMenuItem() {
	const editor = useEditor()
	const shouldDisplay = useValue('any shapes', () => editor.getCurrentPageShapeIds().size > 0, [
		editor,
	])

	return <TldrawUiMenuActionItem action="unlock-all" disabled={!shouldDisplay} />
}

/* ---------------------- Zoom ---------------------- */
/** @public @react */
export function ZoomTo100MenuItem() {
	const editor = useEditor()
	const isZoomedTo100 = useValue('zoomed to 100', () => editor.getZoomLevel() === 1, [editor])

	return <TldrawUiMenuActionItem action="zoom-to-100" noClose disabled={isZoomedTo100} />
}
/** @public @react */
export function ZoomToFitMenuItem() {
	const editor = useEditor()
	const hasShapes = useValue('has shapes', () => editor.getCurrentPageShapeIds().size > 0, [editor])

	return (
		<TldrawUiMenuActionItem
			action="zoom-to-fit"
			disabled={!hasShapes}
			data-testid="minimap.zoom-menu.zoom-to-fit"
			noClose
		/>
	)
}
/** @public @react */
export function ZoomToSelectionMenuItem() {
	const editor = useEditor()
	const hasSelected = useValue('has shapes', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])

	return (
		<TldrawUiMenuActionItem
			action="zoom-to-selection"
			disabled={!hasSelected}
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
				<TldrawUiMenuActionItem action="copy-as-svg" />
				{Boolean(window.navigator.clipboard?.write) && (
					<TldrawUiMenuActionItem action="copy-as-png" />
				)}
				<TldrawUiMenuActionItem action="copy-as-json" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="copy-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function CutMenuItem() {
	const shouldDisplay = useUnlockedSelectedShapesCount(1)

	return <TldrawUiMenuActionItem action="cut" disabled={!shouldDisplay} />
}

/** @public @react */
export function CopyMenuItem() {
	const shouldDisplay = useAnySelectedShapesCount(1)

	return <TldrawUiMenuActionItem action="copy" disabled={!shouldDisplay} />
}

/** @public @react */
export function PasteMenuItem() {
	const shouldDisplay = showMenuPaste

	return <TldrawUiMenuActionItem action="paste" disabled={!shouldDisplay} />
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
					<TldrawUiMenuActionItem action="export-as-svg" />
					<TldrawUiMenuActionItem action="export-as-png" />
					<TldrawUiMenuActionItem action="export-as-json" />
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
	const editor = useEditor()
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.getCurrentPageShapeIds().size > 0,
		[editor]
	)

	return <TldrawUiMenuActionItem action="select-all" disabled={!atLeastOneShapeOnPage} />
}

/* ------------------ Delete Group ------------------ */
/** @public @react */
export function DeleteMenuItem() {
	const oneSelected = useUnlockedSelectedShapesCount(1)

	return <TldrawUiMenuActionItem action="delete" disabled={!oneSelected} />
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
					<TldrawUiMenuActionItem action="align-left" />
					<TldrawUiMenuActionItem action="align-center-horizontal" />
					<TldrawUiMenuActionItem action="align-right" />
					<TldrawUiMenuActionItem action="align-top" />
					<TldrawUiMenuActionItem action="align-center-vertical" />
					<TldrawUiMenuActionItem action="align-bottom" />
				</TldrawUiMenuGroup>
			)}
			<DistributeMenuGroup />
			{twoSelected && (
				<TldrawUiMenuGroup id="stretch">
					<TldrawUiMenuActionItem action="stretch-horizontal" />
					<TldrawUiMenuActionItem action="stretch-vertical" />
				</TldrawUiMenuGroup>
			)}
			{(twoSelected || onlyFlippableShapeSelected) && (
				<TldrawUiMenuGroup id="flip">
					<TldrawUiMenuActionItem action="flip-horizontal" />
					<TldrawUiMenuActionItem action="flip-vertical" />
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
			<TldrawUiMenuActionItem action="distribute-horizontal" />
			<TldrawUiMenuActionItem action="distribute-vertical" />
		</TldrawUiMenuGroup>
	)
}

function OrderMenuGroup() {
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const threeStackableItems = useThreeStackableItems()
	if (!twoSelected) return null

	return (
		<TldrawUiMenuGroup id="order">
			<TldrawUiMenuActionItem action="pack" />
			{threeStackableItems && <TldrawUiMenuActionItem action="stack-horizontal" />}
			{threeStackableItems && <TldrawUiMenuActionItem action="stack-vertical" />}
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
				<TldrawUiMenuActionItem action="bring-to-front" />
				<TldrawUiMenuActionItem action="bring-forward" />
				<TldrawUiMenuActionItem action="send-backward" />
				<TldrawUiMenuActionItem action="send-to-back" />
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
				<TldrawUiMenuActionItem action="move-to-new-page" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function ConvertToBookmarkMenuItem() {
	const editor = useEditor()

	const oneEmbedSelected = useValue(
		'oneEmbedSelected',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false
			return !!(
				editor.isShapeOfType<TLEmbedShape>(onlySelectedShape, 'embed') &&
				onlySelectedShape.props.url &&
				!editor.isShapeOrAncestorLocked(onlySelectedShape)
			)
		},
		[editor]
	)

	if (!oneEmbedSelected) return null
	return <TldrawUiMenuActionItem action="convert-to-bookmark" />
}

/** @public @react */
export function ConvertToEmbedMenuItem() {
	const editor = useEditor()

	const oneEmbeddableBookmarkSelected = useValue(
		'oneEmbeddableBookmarkSelected',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false
			return !!(
				editor.isShapeOfType<TLBookmarkShape>(onlySelectedShape, 'bookmark') &&
				onlySelectedShape.props.url &&
				getEmbedInfo(onlySelectedShape.props.url) &&
				!editor.isShapeOrAncestorLocked(onlySelectedShape)
			)
		},
		[editor]
	)

	if (!oneEmbeddableBookmarkSelected) return null

	return <TldrawUiMenuActionItem action="convert-to-embed" />
}

/* ------------------- Preferences ------------------ */
/** @public @react */
export function ToggleSnapModeItem() {
	const editor = useEditor()
	const isSnapMode = useValue('isSnapMode', () => editor.user.getIsSnapMode(), [editor])
	return <TldrawUiMenuActionCheckboxItem action="toggle-snap-mode" checked={isSnapMode} />
}
/** @public @react */
export function ToggleToolLockItem() {
	const editor = useEditor()
	const isToolLock = useValue('isToolLock', () => editor.getInstanceState().isToolLocked, [editor])
	return <TldrawUiMenuActionCheckboxItem action="toggle-tool-lock" checked={isToolLock} />
}
/** @public @react */
export function ToggleGridItem() {
	const editor = useEditor()
	const isGridMode = useValue('isGridMode', () => editor.getInstanceState().isGridMode, [editor])
	return <TldrawUiMenuActionCheckboxItem action="toggle-grid" checked={isGridMode} />
}

/** @public @react */
export function ToggleWrapModeItem() {
	const editor = useEditor()
	const isWrapMode = useValue('isWrapMode', () => editor.user.getIsWrapMode(), [editor])
	return <TldrawUiMenuActionCheckboxItem action="toggle-wrap-mode" checked={isWrapMode} />
}

/** @public @react */
export function ToggleDarkModeItem() {
	const editor = useEditor()
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	return <TldrawUiMenuActionCheckboxItem action="toggle-dark-mode" checked={isDarkMode} />
}
/** @public @react */
export function ToggleFocusModeItem() {
	const editor = useEditor()
	const isFocusMode = useValue('isFocusMode', () => editor.getInstanceState().isFocusMode, [editor])
	return <TldrawUiMenuActionCheckboxItem action="toggle-focus-mode" checked={isFocusMode} />
}
/** @public @react */
export function ToggleEdgeScrollingItem() {
	const editor = useEditor()
	const edgeScrollSpeed = useValue('edgeScrollSpeed', () => editor.user.getEdgeScrollSpeed(), [
		editor,
	])
	return (
		<TldrawUiMenuActionCheckboxItem
			action="toggle-edge-scrolling"
			checked={edgeScrollSpeed === 1}
		/>
	)
}
/** @public @react */
export function ToggleReduceMotionItem() {
	const editor = useEditor()
	const animationSpeed = useValue('animationSpeed', () => editor.user.getAnimationSpeed(), [editor])
	return (
		<TldrawUiMenuActionCheckboxItem action="toggle-reduce-motion" checked={animationSpeed === 0} />
	)
}
/** @public @react */
export function ToggleDebugModeItem() {
	const editor = useEditor()
	const isDebugMode = useValue('isDebugMode', () => editor.getInstanceState().isDebugMode, [editor])
	return <TldrawUiMenuActionCheckboxItem action="toggle-debug-mode" checked={isDebugMode} />
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
			action="toggle-dynamic-size-mode"
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
	return <TldrawUiMenuActionCheckboxItem action="toggle-paste-at-cursor" checked={pasteAtCursor} />
}

/* ---------------------- Print --------------------- */
/** @public @react */
export function PrintItem() {
	const editor = useEditor()
	const emptyPage = useValue('emptyPage', () => editor.getCurrentPageShapeIds().size === 0, [
		editor,
	])
	return <TldrawUiMenuActionItem action="print" disabled={emptyPage} />
}

/* ---------------------- Multiplayer --------------------- */
/** @public @react */
export function CursorChatItem() {
	const editor = useEditor()
	const shouldShow = useValue(
		'show cursor chat',
		() => editor.getCurrentToolId() === 'select' && !editor.getInstanceState().isCoarsePointer,
		[editor]
	)

	if (!shouldShow) return null

	return <TldrawUiMenuActionItem action="open-cursor-chat" />
}
