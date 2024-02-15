import {
	TLBookmarkShape,
	TLEmbedShape,
	TLFrameShape,
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
import { TldrawUiMenuCheckboxItem } from './menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from './menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from './menus/TldrawUiMenuSubmenu'

/* -------------------- Selection ------------------- */

export function ToggleAutoSizeMenuItem() {
	const actions = useActions()
	const shouldDisplay = useShowAutoSizeToggle()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['toggle-auto-size']} />
}

export function EditLinkMenuItem() {
	const actions = useActions()
	const shouldDisplay = useHasLinkShapeSelected()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['edit-link']} />
}

export function DuplicateMenuItem() {
	const actions = useActions()
	const shouldDisplay = useUnlockedSelectedShapesCount(1)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['duplicate']} />
}

export function GroupMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAllowGroup()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['group']} />
}

export function UngroupMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAllowUngroup()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['ungroup']} />
}

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

export function FitFrameToContentMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldDisplay = useValue(
		'allow fit frame to content',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false
			return editor.getSortedChildIdsForParent(onlySelectedShape).length > 0
		},
		[editor]
	)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['fit-frame-to-content']} />
}

export function ToggleLockMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldDisplay = useValue('selected shapes', () => editor.getSelectedShapes().length > 0, [
		editor,
	])
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['toggle-lock']} />
}

export function ToggleTransparentBgMenuItem() {
	const actions = useActions()
	const editor = useEditor()
	const isTransparentBg = useValue(
		'isTransparentBg',
		() => editor.getInstanceState().exportBackground,
		[editor]
	)
	return <TldrawUiMenuCheckboxItem {...actions['toggle-transparent']} checked={isTransparentBg} />
}

export function UnlockAllMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldDisplay = useValue('any shapes', () => editor.getCurrentPageShapeIds().size > 0, [
		editor,
	])
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['unlock-all']} />
}

/* ---------------------- Zoom ---------------------- */

export function ZoomTo100MenuItem() {
	const editor = useEditor()
	const isZoomedTo100 = useValue('zoomed to 100', () => editor.getZoomLevel() === 1, [editor])
	const actions = useActions()

	return <TldrawUiMenuItem {...actions['zoom-to-100']} noClose disabled={isZoomedTo100} />
}

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

export function ClipboardMenuGroup() {
	return (
		<TldrawUiMenuGroup id="clipboard">
			<CutMenuItem />
			<CopyMenuItem />
			<PasteMenuItem />
		</TldrawUiMenuGroup>
	)
}

export function CutMenuItem() {
	const actions = useActions()
	const shouldDisplay = useUnlockedSelectedShapesCount(1)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['cut']} />
}

export function CopyMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAnySelectedShapesCount(1)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['copy']} />
}

export function PasteMenuItem() {
	const actions = useActions()
	const shouldDisplay = showMenuPaste
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['paste']} />
}

/* ------------------- Conversions ------------------ */

export function ConversionsMenuGroup() {
	const editor = useEditor()
	const actions = useActions()
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.getCurrentPageShapeIds().size > 0,
		[]
	)
	if (!atLeastOneShapeOnPage) return null

	return (
		<TldrawUiMenuGroup id="conversions">
			<TldrawUiMenuSubmenu id="copy-as" label="context-menu.copy-as" size="small">
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

export function SetSelectionGroup() {
	const actions = useActions()
	const editor = useEditor()
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.getCurrentPageShapeIds().size > 0,
		[editor]
	)
	if (!atLeastOneShapeOnPage) return null
	return (
		<TldrawUiMenuGroup id="set-selection-group">
			<TldrawUiMenuItem {...actions['select-all']} />
		</TldrawUiMenuGroup>
	)
}

/* ------------------ Delete Group ------------------ */

export function DeleteGroup() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (!oneSelected) return null
	return (
		<TldrawUiMenuGroup id="delete-group">
			<TldrawUiMenuItem {...actions['delete']} />
		</TldrawUiMenuGroup>
	)
}

/* --------------------- Modify --------------------- */

export function ArrangeMenuSubmenu() {
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const onlyFlippableShapeSelected = useOnlyFlippableShape()
	const actions = useActions()

	if (!(twoSelected || onlyFlippableShapeSelected)) return null

	return (
		<TldrawUiMenuSubmenu id="arrange" label="context-menu.arrange">
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
			{onlyFlippableShapeSelected && (
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

export function MoveToPageMenu() {
	const editor = useEditor()
	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])
	const { addToast } = useToasts()
	const actions = useActions()
	const trackEvent = useUiEvents()

	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (!oneSelected) return null

	console.log(
		currentPageId,
		pages.map((p) => p.id)
	)

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
						title={page.name}
					/>
				))}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="new-page">
				<TldrawUiMenuItem {...actions['new-page']} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

export function EmbedsGroup() {
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

	return (
		<TldrawUiMenuGroup id="embeds">
			{oneEmbedSelected && <TldrawUiMenuItem {...actions['edit-embed']} />}
			{oneEmbedSelected && <TldrawUiMenuItem {...actions['convert-to-bookmark']} />}
			{oneEmbeddableBookmarkSelected && <TldrawUiMenuItem {...actions['convert-to-embed']} />}
		</TldrawUiMenuGroup>
	)
}

/* ------------------- Preferences ------------------ */

export function ToggleSnapModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isSnapMode = useValue('isSnapMode', () => editor.user.getIsSnapMode(), [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-snap-mode']} checked={isSnapMode} />
}

export function ToggleToolLockItem() {
	const actions = useActions()
	const editor = useEditor()
	const isToolLock = useValue('isToolLock', () => editor.getInstanceState().isToolLocked, [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-tool-lock']} checked={isToolLock} />
}

export function ToggleGridItem() {
	const actions = useActions()
	const editor = useEditor()
	const isGridMode = useValue('isGridMode', () => editor.getInstanceState().isGridMode, [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-grid']} checked={isGridMode} />
}

export function ToggleDarkModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-dark-mode']} checked={isDarkMode} />
}

export function ToggleFocusModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isFocusMode = useValue('isFocusMode', () => editor.getInstanceState().isFocusMode, [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-focus-mode']} checked={isFocusMode} />
}

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

export function ToggleReduceMotionItem() {
	const actions = useActions()
	const editor = useEditor()
	const animationSpeed = useValue('animationSpeed', () => editor.user.getAnimationSpeed(), [editor])
	return (
		<TldrawUiMenuCheckboxItem {...actions['toggle-reduce-motion']} checked={animationSpeed === 0} />
	)
}

export function ToggleDebugModeItem() {
	const actions = useActions()
	const editor = useEditor()
	const isDebugMode = useValue('isDebugMode', () => editor.getInstanceState().isDebugMode, [editor])
	return <TldrawUiMenuCheckboxItem {...actions['toggle-debug-mode']} checked={isDebugMode} />
}

/* ---------------------- Print --------------------- */

export function PrintItem() {
	const editor = useEditor()
	const actions = useActions()
	const emptyPage = useValue('emptyPage', () => editor.getCurrentPageShapeIds().size === 0, [
		editor,
	])
	return <TldrawUiMenuItem {...actions['print']} disabled={emptyPage} />
}
