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
import { useActions } from '../context/actions'
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
import { TldrawUiMenuCheckboxItem } from './primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from './primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

/* -------------------- Selection ------------------- */
/** @public @react */
export function ToggleAutoSizeMenuItem() {
	const actions = useActions()
	const shouldDisplay = useShowAutoSizeToggle()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['toggle-auto-size']} />
}
/** @public @react */
export function EditLinkMenuItem() {
	const actions = useActions()
	const shouldDisplay = useHasLinkShapeSelected()
	if (!shouldDisplay) return null

	return <TldrawUiMenuItem {...actions['edit-link']} />
}
/** @public @react */
export function DuplicateMenuItem() {
	const actions = useActions()
	const shouldDisplay = useUnlockedSelectedShapesCount(1)
	if (!shouldDisplay) return null

	return <TldrawUiMenuItem {...actions['duplicate']} />
}
/** @public @react */
export function FlattenMenuItem() {
	const actions = useActions()
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

	return <TldrawUiMenuItem {...actions['flatten-to-image']} />
}
/** @public @react */
export function GroupMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAllowGroup()
	if (!shouldDisplay) return null

	return <TldrawUiMenuItem {...actions['group']} />
}
/** @public @react */
export function UngroupMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAllowUngroup()
	if (!shouldDisplay) return null

	return <TldrawUiMenuItem {...actions['ungroup']} />
}
/** @public @react */
export function RemoveFrameMenuItem() {
	const editor = useEditor()
	const actions = useActions()
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

	return <TldrawUiMenuItem {...actions['remove-frame']} />
}
/** @public @react */
export function FitFrameToContentMenuItem() {
	const editor = useEditor()
	const actions = useActions()
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

	return <TldrawUiMenuItem {...actions['fit-frame-to-content']} />
}
/** @public @react */
export function ToggleLockMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldDisplay = useValue('selected shapes', () => editor.getSelectedShapes().length > 0, [
		editor,
	])
	if (!shouldDisplay) return null

	return <TldrawUiMenuItem {...actions['toggle-lock']} />
}
/** @public @react */
export function ToggleTransparentBgMenuItem() {
	const actions = useActions()
	const editor = useEditor()
	const isTransparentBg = useValue(
		'isTransparentBg',
		() => !editor.getInstanceState().exportBackground,
		[editor]
	)
	return (
		<TldrawUiMenuCheckboxItem {...actions['toggle-transparent']} checked={isTransparentBg} toggle />
	)
}
/** @public @react */
export function UnlockAllMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldDisplay = useValue('any shapes', () => editor.getCurrentPageShapeIds().size > 0, [
		editor,
	])

	return <TldrawUiMenuItem {...actions['unlock-all']} disabled={!shouldDisplay} />
}

/* ---------------------- Zoom ---------------------- */
/** @public @react */
export function ZoomTo100MenuItem() {
	const editor = useEditor()
	const isZoomedTo100 = useValue('zoomed to 100', () => editor.getZoomLevel() === 1, [editor])
	const actions = useActions()

	return <TldrawUiMenuItem {...actions['zoom-to-100']} noClose disabled={isZoomedTo100} />
}
/** @public @react */
export function ZoomToFitMenuItem() {
	const editor = useEditor()
	const hasShapes = useValue('has shapes', () => editor.getCurrentPageShapeIds().size > 0, [editor])
	const actions = useActions()

	return (
		<TldrawUiMenuItem
			{...actions['zoom-to-fit']}
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
	const actions = useActions()

	return (
		<TldrawUiMenuItem
			{...actions['zoom-to-selection']}
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
	const actions = useActions()
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
				<TldrawUiMenuItem {...actions['copy-as-svg']} />
				{Boolean(window.navigator.clipboard?.write) && (
					<TldrawUiMenuItem {...actions['copy-as-png']} />
				)}
				<TldrawUiMenuItem {...actions['copy-as-json']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="copy-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function CutMenuItem() {
	const actions = useActions()
	const shouldDisplay = useUnlockedSelectedShapesCount(1)

	return <TldrawUiMenuItem {...actions['cut']} disabled={!shouldDisplay} />
}

/** @public @react */
export function CopyMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAnySelectedShapesCount(1)

	return <TldrawUiMenuItem {...actions['copy']} disabled={!shouldDisplay} />
}

/** @public @react */
export function PasteMenuItem() {
	const actions = useActions()
	const shouldDisplay = showMenuPaste

	return <TldrawUiMenuItem {...actions['paste']} disabled={!shouldDisplay} />
}

/* ------------------- Conversions ------------------ */

/** @public @react */
export function ConversionsMenuGroup() {
	const editor = useEditor()
	const actions = useActions()
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
					<TldrawUiMenuItem {...actions['export-as-svg']} />
					<TldrawUiMenuItem {...actions['export-as-png']} />
					<TldrawUiMenuItem {...actions['export-as-json']} />
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
	const actions = useActions()
	const editor = useEditor()
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.getCurrentPageShapeIds().size > 0,
		[editor]
	)

	return <TldrawUiMenuItem {...actions['select-all']} disabled={!atLeastOneShapeOnPage} />
}

/* ------------------ Delete Group ------------------ */
/** @public @react */
export function DeleteMenuItem() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)

	return <TldrawUiMenuItem {...actions['delete']} disabled={!oneSelected} />
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
	const actions = useActions()

	if (!(twoSelected || onlyFlippableShapeSelected)) return null

	return (
		<TldrawUiMenuSubmenu id="arrange" label="context-menu.arrange" size="small">
			{twoSelected && (
				<TldrawUiMenuGroup id="align">
					<TldrawUiMenuItem {...actions['align-left']} />
					<TldrawUiMenuItem {...actions['align-center-horizontal']} />
					<TldrawUiMenuItem {...actions['align-right']} />
					<TldrawUiMenuItem {...actions['align-top']} />
					<TldrawUiMenuItem {...actions['align-center-vertical']} />
					<TldrawUiMenuItem {...actions['align-bottom']} />
				</TldrawUiMenuGroup>
			)}
			<DistributeMenuGroup />
			{twoSelected && (
				<TldrawUiMenuGroup id="stretch">
					<TldrawUiMenuItem {...actions['stretch-horizontal']} />
					<TldrawUiMenuItem {...actions['stretch-vertical']} />
				</TldrawUiMenuGroup>
			)}
			{(twoSelected || onlyFlippableShapeSelected) && (
				<TldrawUiMenuGroup id="flip">
					<TldrawUiMenuItem {...actions['flip-horizontal']} />
					<TldrawUiMenuItem {...actions['flip-vertical']} />
				</TldrawUiMenuGroup>
			)}
			<OrderMenuGroup />
		</TldrawUiMenuSubmenu>
	)
}

function DistributeMenuGroup() {
	const actions = useActions()
	const threeSelected = useUnlockedSelectedShapesCount(3)
	if (!threeSelected) return null

	return (
		<TldrawUiMenuGroup id="distribute">
			<TldrawUiMenuItem {...actions['distribute-horizontal']} />
			<TldrawUiMenuItem {...actions['distribute-vertical']} />
		</TldrawUiMenuGroup>
	)
}

function OrderMenuGroup() {
	const actions = useActions()
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const threeStackableItems = useThreeStackableItems()
	if (!twoSelected) return null

	return (
		<TldrawUiMenuGroup id="order">
			<TldrawUiMenuItem {...actions['pack']} />
			{threeStackableItems && <TldrawUiMenuItem {...actions['stack-horizontal']} />}
			{threeStackableItems && <TldrawUiMenuItem {...actions['stack-vertical']} />}
		</TldrawUiMenuGroup>
	)
}
/** @public @react */
export function ReorderMenuSubmenu() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (!oneSelected) return null

	return (
		<TldrawUiMenuSubmenu id="reorder" label="context-menu.reorder" size="small">
			<TldrawUiMenuGroup id="reorder">
				<TldrawUiMenuItem {...actions['bring-to-front']} />
				<TldrawUiMenuItem {...actions['bring-forward']} />
				<TldrawUiMenuItem {...actions['send-backward']} />
				<TldrawUiMenuItem {...actions['send-to-back']} />
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
	const actions = useActions()
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
							editor.mark('move_shapes_to_page')
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
												editor.mark('change-page')
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
				<TldrawUiMenuItem {...actions['move-to-new-page']} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function ConvertToBookmarkMenuItem() {
	const editor = useEditor()
	const actions = useActions()

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
	return <TldrawUiMenuItem {...actions['convert-to-bookmark']} />
}

/** @public @react */
export function ConvertToEmbedMenuItem() {
	const editor = useEditor()
	const actions = useActions()

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

	return <TldrawUiMenuItem {...actions['convert-to-embed']} />
}

/* ------------------- Preferences ------------------ */
/** @public @react */
export function ToggleSnapModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isSnapMode = useValue('isSnapMode', () => editor.user.getIsSnapMode(), [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-snap-mode']} checked={isSnapMode} />
}
/** @public @react */
export function ToggleToolLockItem() {
	const actions = useActions()
	const editor = useEditor()
	const isToolLock = useValue('isToolLock', () => editor.getInstanceState().isToolLocked, [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-tool-lock']} checked={isToolLock} />
}
/** @public @react */
export function ToggleGridItem() {
	const actions = useActions()
	const editor = useEditor()
	const isGridMode = useValue('isGridMode', () => editor.getInstanceState().isGridMode, [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-grid']} checked={isGridMode} />
}

/** @public @react */
export function ToggleWrapModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isWrapMode = useValue('isWrapMode', () => editor.user.getIsWrapMode(), [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-wrap-mode']} checked={isWrapMode} />
}

/** @public @react */
export function ToggleDarkModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-dark-mode']} checked={isDarkMode} />
}
/** @public @react */
export function ToggleFocusModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isFocusMode = useValue('isFocusMode', () => editor.getInstanceState().isFocusMode, [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-focus-mode']} checked={isFocusMode} />
}
/** @public @react */
export function ToggleEdgeScrollingItem() {
	const actions = useActions()
	const editor = useEditor()
	const edgeScrollSpeed = useValue('edgeScrollSpeed', () => editor.user.getEdgeScrollSpeed(), [
		editor,
	])
	return (
		<TldrawUiMenuCheckboxItem
			{...actions['toggle-edge-scrolling']}
			checked={edgeScrollSpeed === 1}
		/>
	)
}
/** @public @react */
export function ToggleReduceMotionItem() {
	const actions = useActions()
	const editor = useEditor()
	const animationSpeed = useValue('animationSpeed', () => editor.user.getAnimationSpeed(), [editor])
	return (
		<TldrawUiMenuCheckboxItem {...actions['toggle-reduce-motion']} checked={animationSpeed === 0} />
	)
}
/** @public @react */
export function ToggleDebugModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isDebugMode = useValue('isDebugMode', () => editor.getInstanceState().isDebugMode, [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-debug-mode']} checked={isDebugMode} />
}

/** @public @react */
export function ToggleDynamicSizeModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isDynamicResizeMode = useValue(
		'dynamic resize',
		() => editor.user.getIsDynamicResizeMode(),
		[editor]
	)
	return (
		<TldrawUiMenuCheckboxItem
			{...actions['toggle-dynamic-size-mode']}
			checked={isDynamicResizeMode}
		/>
	)
}

/** @public @react */
export function TogglePasteAtCursorItem() {
	const actions = useActions()
	const editor = useEditor()
	const pasteAtCursor = useValue('paste at cursor', () => editor.user.getIsPasteAtCursorMode(), [
		editor,
	])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-paste-at-cursor']} checked={pasteAtCursor} />
}

/* ---------------------- Print --------------------- */
/** @public @react */
export function PrintItem() {
	const editor = useEditor()
	const actions = useActions()
	const emptyPage = useValue('emptyPage', () => editor.getCurrentPageShapeIds().size === 0, [
		editor,
	])
	return <TldrawUiMenuItem {...actions['print']} disabled={emptyPage} />
}

/* ---------------------- Multiplayer --------------------- */
/** @public @react */
export function CursorChatItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldShow = useValue(
		'show cursor chat',
		() => editor.getCurrentToolId() === 'select' && !editor.getInstanceState().isCoarsePointer,
		[editor]
	)

	if (!shouldShow) return null

	return <TldrawUiMenuItem {...actions['open-cursor-chat']} />
}
