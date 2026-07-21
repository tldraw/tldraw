// Fork of packages/tldraw/src/lib/ui/components/PageMenu/DefaultPageMenu.tsx
// (as of 87b69cb31) adding page dividers (#9445): an empty page named `---`
// renders as a divider line that cannot be selected or renamed, only moved
// and deleted. When updating the SDK page menu, diff against that file.
import {
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	PointerEvent as ReactPointerEvent,
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	PORTRAIT_BREAKPOINT,
	PageItemInput,
	PageRecordType,
	TLPageId,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	releasePointerCapture,
	setPointerCapture,
	useBreakpoint,
	useEditor,
	useMenuIsOpen,
	useReadonly,
	useTranslation,
	useUiEvents,
	useValue,
} from 'tldraw'
import { defineMessages, useMsg } from '../../../utils/i18n'
import {
	getNearestNonDividerPageId,
	isDividerName,
	isPageDivider,
} from '../../../utils/pageDividers'
import { onMovePage } from './edit-pages-shared'
import { TlaPageItemSubmenu } from './TlaPageItemSubmenu'
import styles from './TlaPageMenu.module.css'

const messages = defineMessages({
	pageDivider: { defaultMessage: 'Page divider' },
})

const PAGE_MENU_LIST_HEIGHT_KEY = 'tldraw_page_menu_list_height'
const MAX_PAGE_MENU_RENDER_HEIGHT = 800
const LIST_BOTTOM_PADDING = 4
const MAX_PAGE_MENU_AVAILABLE_HEIGHT_RATIO = 0.62
const PAGE_MENU_CREATE_BUTTON_HEIGHT = 40
const PAGE_MENU_RESIZE_HANDLE_HEIGHT = 1
const PAGE_MENU_ITEM_HEIGHT = 36
// Divider rows take half the vertical space of a regular page row. Rows are
// absolutely positioned from prefix-summed offsets, so mixed heights work.
const PAGE_MENU_DIVIDER_ITEM_HEIGHT = 18
const MIN_PAGE_MENU_LIST_HEIGHT = PAGE_MENU_ITEM_HEIGHT + LIST_BOTTOM_PADDING
const PAGE_MENU_DRAG_THRESHOLD = 5
const PAGE_MENU_AUTO_SCROLL_ZONE = 16
const PAGE_MENU_AUTO_SCROLL_RAMP_DISTANCE = 48
const PAGE_MENU_MIN_AUTO_SCROLL_SPEED = 1
const PAGE_MENU_MAX_AUTO_SCROLL_SPEED = 6

function readSavedPageMenuListHeight(): number | null {
	if (typeof window === 'undefined') return null
	try {
		const raw = window.localStorage.getItem(PAGE_MENU_LIST_HEIGHT_KEY)
		if (!raw) return null
		const n = Number(raw)
		return Number.isFinite(n) && n >= MIN_PAGE_MENU_LIST_HEIGHT ? n : null
	} catch {
		return null
	}
}

function getPageMenuRenderCap(availableHeight: number): number {
	const maxMenuHeight = Math.min(
		MAX_PAGE_MENU_RENDER_HEIGHT,
		availableHeight * MAX_PAGE_MENU_AVAILABLE_HEIGHT_RATIO
	)
	const footerHeight = PAGE_MENU_CREATE_BUTTON_HEIGHT + PAGE_MENU_RESIZE_HANDLE_HEIGHT
	return Math.max(MIN_PAGE_MENU_LIST_HEIGHT, maxMenuHeight - footerHeight)
}

function getPageMenuAutoFitListHeight(contentHeight: number): number {
	return Math.max(MIN_PAGE_MENU_LIST_HEIGHT, contentHeight + LIST_BOTTOM_PADDING)
}

export const TlaPageMenu = memo(function TlaPageMenu() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const pageDividerLbl = useMsg(messages.pageDivider)

	// The id of the page currently being renamed inline, if any.
	const [editingPageId, setEditingPageId] = useState<TLPageId | null>(null)

	const closePageItemSubmenus = useCallback(
		(exceptIndex?: number) => {
			const contextSuffix = `-${editor.contextId}`
			for (const menuId of editor.menus.getOpenMenus()) {
				const id = menuId.endsWith(contextSuffix) ? menuId.slice(0, -contextSuffix.length) : menuId
				if (!id.startsWith('page item submenu ')) continue
				if (exceptIndex !== undefined && id === `page item submenu ${exceptIndex}`) continue
				editor.menus.deleteOpenMenu(id)
			}
		},
		[editor]
	)

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			setEditingPageId(null)
			if (!isOpen) {
				closePageItemSubmenus()
			}
		},
		[closePageItemSubmenus]
	)

	const [isOpen, onOpenChange] = useMenuIsOpen('page-menu', handleOpenChange)

	const rSortableContainer = useRef<HTMLDivElement>(null)

	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPage = useValue('currentPage', () => editor.getCurrentPage(), [editor])

	// Divider status is derived: a page is a divider while it is named `---`
	// (or more hyphens), has no shapes, and is not the current page.
	const dividerPageIds = useValue(
		'dividerPageIds',
		() => {
			const ids = new Set<TLPageId>()
			for (const page of editor.getPages()) {
				if (isPageDivider(editor, page)) ids.add(page.id)
			}
			return ids
		},
		[editor]
	)

	const isReadonlyMode = useReadonly()

	// Row layout: dividers are half-height, so row positions come from prefix
	// sums rather than index * item height. Kept in a ref so the pointer-drag
	// handlers always read the current layout without re-binding.
	const rowHeights = pages.map((page) =>
		dividerPageIds.has(page.id) ? PAGE_MENU_DIVIDER_ITEM_HEIGHT : PAGE_MENU_ITEM_HEIGHT
	)
	const rowOffsets: number[] = []
	let contentHeight = 0
	for (const height of rowHeights) {
		rowOffsets.push(contentHeight)
		contentHeight += height
	}
	const rLayout = useRef({ rowHeights, rowOffsets, contentHeight })
	rLayout.current = { rowHeights, rowOffsets, contentHeight }

	const isCoarsePointer = useValue(
		'isCoarsePointer',
		() => editor.getInstanceState().isCoarsePointer,
		[editor]
	)

	// null = auto-fit to the number of pages (capped). A number means the user
	// has pinned the list to that height via the resize handle.
	const [userListHeight, setUserListHeight] = useState<number | null>(readSavedPageMenuListHeight)
	const [isResizing, setIsResizing] = useState(false)
	const [availableHeight, setAvailableHeight] = useState(() =>
		typeof window === 'undefined' ? 800 : window.innerHeight
	)

	const updateAvailableHeight = useCallback(() => {
		if (typeof window === 'undefined') return

		const popoverContent =
			rSortableContainer.current?.closest<HTMLElement>('.tlui-popover__content')
		const radixAvailableHeight = popoverContent
			? Number.parseFloat(
					getComputedStyle(popoverContent).getPropertyValue(
						'--radix-popover-content-available-height'
					)
				)
			: NaN

		setAvailableHeight(
			Number.isFinite(radixAvailableHeight) ? radixAvailableHeight : window.innerHeight
		)
	}, [])

	useEffect(() => {
		const onResize = () => updateAvailableHeight()
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [updateAvailableHeight])

	useEffect(() => {
		if (!isOpen) return
		editor.timers.requestAnimationFrame(updateAvailableHeight)
	}, [editor, isOpen, updateAvailableHeight])

	const renderCap = getPageMenuRenderCap(availableHeight)
	const autoFitListHeight = getPageMenuAutoFitListHeight(contentHeight)
	const renderedListHeight = Math.min(userListHeight ?? autoFitListHeight, renderCap)
	const hasReachedMaxPages = pages.length >= editor.options.maxPages
	const createPageButtonLabel = msg(
		hasReachedMaxPages ? 'page-menu.max-pages-reached' : 'page-menu.create-new-page'
	)

	const handleResizePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
		e.preventDefault()
		const handle = e.currentTarget
		handle.setPointerCapture(e.pointerId)
		const startY = e.clientY
		// Start the drag from what the user currently sees, so the divider
		// tracks the cursor even when the stored preference exceeds the cap.
		const startHeight = handle.previousElementSibling?.getBoundingClientRect().height ?? 0
		let nextHeight = startHeight

		setIsResizing(true)

		const onMove = (moveEvent: PointerEvent) => {
			nextHeight = Math.max(MIN_PAGE_MENU_LIST_HEIGHT, startHeight + (moveEvent.clientY - startY))
			setUserListHeight(nextHeight)
		}

		const onUp = () => {
			handle.removeEventListener('pointermove', onMove)
			handle.removeEventListener('pointerup', onUp)
			handle.removeEventListener('pointercancel', onUp)
			setIsResizing(false)
			try {
				window.localStorage.setItem(PAGE_MENU_LIST_HEIGHT_KEY, String(nextHeight))
			} catch {
				// ignore — storage may be unavailable in private/embedded contexts
			}
		}

		handle.addEventListener('pointermove', onMove)
		handle.addEventListener('pointerup', onUp, { once: true })
		handle.addEventListener('pointercancel', onUp, { once: true })
	}, [])

	const handleResizeDoubleClick = useCallback(() => {
		setUserListHeight(null)
		try {
			window.localStorage.removeItem(PAGE_MENU_LIST_HEIGHT_KEY)
		} catch {
			// ignore — storage may be unavailable in private/embedded contexts
		}
	}, [])

	useEffect(
		function closePageMenuOnEnterPressAfterPressingEnterToConfirmRename() {
			const doc = editor.getContainerDocument()
			function handleKeyDown() {
				if (editingPageId) return
				if (doc.activeElement === doc.body) {
					editor.menus.clearOpenMenus()
				}
			}

			doc.addEventListener('keydown', handleKeyDown, { passive: true })
			return () => {
				doc.removeEventListener('keydown', handleKeyDown)
			}
		},
		[editor, editingPageId]
	)

	const rMutables = useRef({
		status: 'idle' as 'idle' | 'pointing' | 'dragging',
		id: null as TLPageId | null,
		startIndex: 0,
		dragIndex: 0,
		startY: 0,
		startScrollTop: 0,
		lastClientY: 0,
		// Set true on pointer-up after a drag, so the synthetic click that
		// follows pointer-up doesn't also navigate to the dragged page.
		justDragged: false,
		startedOnDragHandle: false,
		// Whether an auto-scroll rAF is in flight; the loop reschedules itself
		// while status === 'dragging' and exits otherwise.
		autoScrollScheduled: false,
	})

	// The single source of truth for an in-progress drag. Null when idle.
	// Other rows' positions are derived from startIndex/dragIndex during render.
	const [dragState, setDragState] = useState<{
		id: TLPageId
		startIndex: number
		dragIndex: number
		offsetY: number
	} | null>(null)

	// Scroll the current page into view when the menu opens / when current page changes.
	// Rows are absolutely positioned at top:0 and translated via transform, so
	// `offsetTop` is always 0 — derive the row's visual position from its index.
	useEffect(() => {
		if (!isOpen) return
		editor.timers.requestAnimationFrame(() => {
			const container = rSortableContainer.current
			if (!container) return
			const currentIndex = editor.getPages().findIndex((p) => p.id === currentPage.id)
			if (currentIndex === -1) return

			const doc = editor.getContainerDocument()
			const elm = doc.querySelector(`[data-pageid="${currentPage.id}"]`) as HTMLDivElement | null
			elm?.querySelector<HTMLButtonElement>('button.tlui-page-menu__item__button')?.focus()

			const elmTop = rLayout.current.rowOffsets[currentIndex]
			const elmBottom = elmTop + rLayout.current.rowHeights[currentIndex]
			const viewTop = container.scrollTop
			const viewBottom = viewTop + container.clientHeight
			if (elmTop < viewTop) {
				container.scrollTo({ top: elmTop })
			} else if (elmBottom > viewBottom) {
				container.scrollTo({ top: elmBottom - container.clientHeight })
			}
		})
	}, [currentPage.id, isOpen, editor])

	// Recomputes the dragged row's offset and dragIndex from the current
	// pointer position and container scrollTop, then publishes the new
	// dragState so the rest of the rows shift around it.
	const updateDragFromPointer = useCallback((clientY: number) => {
		const mut = rMutables.current
		if (mut.status !== 'dragging' || !mut.id) return
		const { rowHeights, rowOffsets, contentHeight } = rLayout.current
		const dragRowHeight = rowHeights[mut.startIndex]
		const scrollTop = rSortableContainer.current?.scrollTop ?? 0
		// Offsets the cursor delta by any auto-scroll that has happened
		// since the drag started, so the row tracks the cursor as the
		// list scrolls underneath it.
		const rawOffsetY = clientY - mut.startY + (scrollTop - mut.startScrollTop)
		// Clamp the dragged row's visible position to the first/last slot
		// so its transform never extends the popover scroll area.
		const minDragY = 0
		const maxDragY = contentHeight - dragRowHeight
		const dragY = Math.max(minDragY, Math.min(maxDragY, rowOffsets[mut.startIndex] + rawOffsetY))
		const offsetY = dragY - rowOffsets[mut.startIndex]
		// The drop slot is the row whose vertical span contains the dragged
		// row's center. (With uniform heights this reduces to the old
		// round(dragY / itemHeight) behavior.)
		const dragCenter = dragY + dragRowHeight / 2
		let dragIndex = rowHeights.length - 1
		for (let i = 0; i < rowHeights.length; i++) {
			if (dragCenter < rowOffsets[i] + rowHeights[i]) {
				dragIndex = i
				break
			}
		}
		mut.dragIndex = dragIndex
		mut.lastClientY = clientY
		setDragState({ id: mut.id, startIndex: mut.startIndex, dragIndex, offsetY })
	}, [])

	// During a drag, the list should only scroll from the auto-scroll loop
	// below. Native wheel/trackpad scroll would fight the drag position.
	useEffect(() => {
		if (!isOpen) return
		const container = rSortableContainer.current
		if (!container) return
		function onWheel(e: WheelEvent) {
			if (rMutables.current.status !== 'dragging') return
			e.preventDefault()
		}
		container.addEventListener('wheel', onWheel, { passive: false })
		return () => container.removeEventListener('wheel', onWheel)
	}, [isOpen])

	const tickAutoScrollDuringDrag = useCallback(() => {
		const mut = rMutables.current
		const container = rSortableContainer.current
		if (mut.status !== 'dragging' || !container) {
			mut.autoScrollScheduled = false
			return
		}
		const rect = container.getBoundingClientRect()
		const fromTop = mut.lastClientY - rect.top
		const fromBottom = rect.bottom - mut.lastClientY
		const maxScroll = container.scrollHeight - container.clientHeight
		// During a drag, scroll speed ramps up as the pointer approaches and
		// passes the edge of the scroll container.
		// `overshoot` is 0 at the inner edge of PAGE_MENU_AUTO_SCROLL_ZONE and grows
		// as the cursor approaches and passes the edge of the container.
		const overshootTop = PAGE_MENU_AUTO_SCROLL_ZONE - fromTop
		const overshootBottom = PAGE_MENU_AUTO_SCROLL_ZONE - fromBottom
		let dy = 0
		if (overshootTop > 0 && container.scrollTop > 0) {
			const t = Math.min(1, overshootTop / PAGE_MENU_AUTO_SCROLL_RAMP_DISTANCE)
			const speed =
				PAGE_MENU_MIN_AUTO_SCROLL_SPEED +
				(PAGE_MENU_MAX_AUTO_SCROLL_SPEED - PAGE_MENU_MIN_AUTO_SCROLL_SPEED) * t
			dy = -Math.ceil(speed)
		} else if (overshootBottom > 0 && container.scrollTop < maxScroll) {
			const t = Math.min(1, overshootBottom / PAGE_MENU_AUTO_SCROLL_RAMP_DISTANCE)
			const speed =
				PAGE_MENU_MIN_AUTO_SCROLL_SPEED +
				(PAGE_MENU_MAX_AUTO_SCROLL_SPEED - PAGE_MENU_MIN_AUTO_SCROLL_SPEED) * t
			dy = Math.ceil(speed)
		}
		if (dy !== 0) {
			const before = container.scrollTop
			container.scrollTop = Math.max(0, Math.min(maxScroll, before + dy))
			if (container.scrollTop !== before) {
				updateDragFromPointer(mut.lastClientY)
			}
		}
		editor.timers.requestAnimationFrame(tickAutoScrollDuringDrag)
	}, [editor, updateDragFromPointer])

	const ensureAutoScrollLoop = useCallback(() => {
		const mut = rMutables.current
		if (mut.autoScrollScheduled) return
		mut.autoScrollScheduled = true
		editor.timers.requestAnimationFrame(tickAutoScrollDuringDrag)
	}, [editor, tickAutoScrollDuringDrag])

	const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
		if (e.button !== 0) return

		const { clientY, currentTarget } = e
		const { id, index } = currentTarget.dataset
		if (!id || index === undefined) return

		const startedOnDragHandle = currentTarget.dataset.dragHandle === 'true'
		if (startedOnDragHandle) {
			e.preventDefault()
			e.stopPropagation()
		}

		const mut = rMutables.current
		setPointerCapture(currentTarget, e)
		mut.status = 'pointing'
		mut.id = id as TLPageId
		mut.startIndex = +index
		mut.dragIndex = +index
		mut.startY = clientY
		mut.lastClientY = clientY
		mut.startScrollTop = rSortableContainer.current?.scrollTop ?? 0
		mut.startedOnDragHandle = startedOnDragHandle
	}, [])

	const handlePointerMove = useCallback(
		(e: ReactPointerEvent<HTMLButtonElement>) => {
			const mut = rMutables.current
			const { clientY } = e
			if (mut.status === 'pointing') {
				if (Math.abs(clientY - mut.startY) <= PAGE_MENU_DRAG_THRESHOLD) return
				mut.status = 'dragging'
				mut.lastClientY = clientY
				ensureAutoScrollLoop()
			}
			if (mut.status === 'dragging') {
				e.preventDefault()
				updateDragFromPointer(clientY)
			}
		},
		[ensureAutoScrollLoop, updateDragFromPointer]
	)

	const handlePointerUp = useCallback(
		(e: ReactPointerEvent<HTMLButtonElement>) => {
			const mut = rMutables.current
			if (mut.status === 'dragging' && mut.id) {
				onMovePage(editor, mut.id, mut.startIndex, mut.dragIndex, trackEvent)
				if (!mut.startedOnDragHandle) {
					mut.justDragged = true
				}
			}
			releasePointerCapture(e.currentTarget, e)
			mut.status = 'idle'
			mut.id = null
			mut.startedOnDragHandle = false
			setDragState(null)
		},
		[editor, trackEvent]
	)

	const handleItemContextMenu = useCallback(
		(e: ReactMouseEvent<HTMLDivElement>, index: number) => {
			e.preventDefault()
			e.stopPropagation()

			closePageItemSubmenus(index)
			editor.menus.addOpenMenu(`page item submenu ${index}`)
		},
		[closePageItemSubmenus, editor]
	)

	const handlePointerCancel = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
		const mut = rMutables.current
		releasePointerCapture(e.currentTarget, e)
		mut.status = 'idle'
		mut.id = null
		mut.startedOnDragHandle = false
		setDragState(null)
	}, [])

	const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLButtonElement>) => {
		const mut = rMutables.current
		// Pointer capture is naturally released on the eventual pointer up,
		// at which point the idle status makes the up handler a no-op.
		if (e.key === 'Escape' && mut.status !== 'idle') {
			mut.status = 'idle'
			mut.id = null
			mut.startedOnDragHandle = false
			setDragState(null)
		}
	}, [])

	const shouldUseWindowPrompt = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM && isCoarsePointer
	const shouldUseDragHandle = !isReadonlyMode && isCoarsePointer

	// A rename can turn an empty page into a divider. Dividers can't be the
	// current page, so when the renamed page is current, step to the nearest
	// regular page so the row turns into a divider right away. (This is the
	// normal divider-creation flow: creating a page makes it current before
	// the inline rename starts.)
	const stepOffConvertedDivider = useCallback(
		(id: TLPageId) => {
			const page = editor.getPage(id)
			if (!page) return
			if (editor.getCurrentPageId() !== id) return
			if (!isDividerName(page.name) || editor.getPageShapeIds(id).size > 0) return
			const nearestId = getNearestNonDividerPageId(editor, id)
			if (nearestId) editor.setCurrentPage(nearestId)
		},
		[editor]
	)

	const startRenamingPage = useCallback(
		(id: TLPageId, currentName: string) => {
			if (isReadonlyMode) return
			if (shouldUseWindowPrompt) {
				const name = window.prompt(msg('action.rename'), currentName)
				if (name && name !== currentName) {
					editor.renamePage(id, name)
					trackEvent('rename-page', { source: 'page-menu' })
					stepOffConvertedDivider(id)
				}
				return
			}
			setEditingPageId(id)
		},
		[editor, msg, isReadonlyMode, shouldUseWindowPrompt, stepOffConvertedDivider, trackEvent]
	)

	const handleCreatePageClick = useCallback(() => {
		if (isReadonlyMode) return

		const newPageId = PageRecordType.createId()
		const initialName = msg('page-menu.new-page-initial-name')
		let name = initialName

		if (shouldUseWindowPrompt) {
			const result = window.prompt(msg('page-menu.create-new-page'), initialName)
			if (result === null) return
			name = result || initialName
		}

		editor.run(() => {
			editor.markHistoryStoppingPoint('creating page')
			editor.createPage({ name, id: newPageId })
			editor.setCurrentPage(newPageId)
		})

		if (!shouldUseWindowPrompt) {
			startRenamingPage(newPageId, initialName)
		} else {
			stepOffConvertedDivider(newPageId)
		}
		trackEvent('new-page', { source: 'page-menu' })
	}, [
		editor,
		msg,
		isReadonlyMode,
		shouldUseWindowPrompt,
		startRenamingPage,
		stepOffConvertedDivider,
		trackEvent,
	])

	const changePage = useCallback(
		(id: TLPageId) => {
			editor.setCurrentPage(id)
			trackEvent('change-page', { source: 'page-menu' })
		},
		[editor, trackEvent]
	)

	return (
		<TldrawUiPopover id="pages" onOpenChange={onOpenChange} open={isOpen}>
			<TldrawUiPopoverTrigger data-testid="main.page-menu">
				<TldrawUiButton
					type="menu"
					tooltip={currentPage.name}
					title={currentPage.name}
					data-testid="page-menu.button"
					className="tlui-page-menu__trigger"
				>
					<TldrawUiButtonLabel>{currentPage.name}</TldrawUiButtonLabel>
					<TldrawUiButtonIcon icon="chevron-down" small />
				</TldrawUiButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent
				side="bottom"
				align="start"
				sideOffset={0}
				disableEscapeKeyDown={editingPageId !== null}
			>
				<div className="tlui-page-menu__wrapper">
					<div
						data-testid="page-menu.list"
						className="tlui-page-menu__list"
						ref={rSortableContainer}
						style={{ height: renderedListHeight }}
					>
						<div
							className="tlui-page-menu__list__content"
							data-dragging={dragState !== null}
							style={{ height: autoFitListHeight }}
						>
							{pages.map((page, index) => {
								const isCurrentPage = page.id === currentPage.id
								const isRenamingThisPage = editingPageId === page.id
								const isDragging = dragState?.id === page.id
								const isDivider = dividerPageIds.has(page.id)

								let y = rowOffsets[index]
								if (dragState) {
									// Displaced rows shift by the dragged row's height, which
									// differs between page rows and divider rows.
									const dragRowHeight = rowHeights[dragState.startIndex]
									if (isDragging) {
										y = rowOffsets[dragState.startIndex] + dragState.offsetY
									} else {
										const { startIndex, dragIndex } = dragState
										if (dragIndex < startIndex && index >= dragIndex && index < startIndex) {
											y = rowOffsets[index] + dragRowHeight
										} else if (dragIndex > startIndex && index > startIndex && index <= dragIndex) {
											y = rowOffsets[index] - dragRowHeight
										}
									}
								}

								return (
									<div
										key={page.id}
										data-pageid={page.id}
										data-testid="page-menu.item"
										data-iscurrent={isCurrentPage}
										data-dragging={isDragging}
										data-editing={isRenamingThisPage}
										data-isdivider={isDivider}
										className="tlui-page-menu__item"
										onContextMenu={
											!isReadonlyMode && !isRenamingThisPage
												? (e) => handleItemContextMenu(e, index)
												: undefined
										}
										style={{
											zIndex: isDragging
												? pages.length + 2
												: isCurrentPage
													? pages.length + 1
													: index,
											transform: `translateY(${y}px)`,
										}}
									>
										{isRenamingThisPage ? (
											<div className="tlui-page-menu__item__title">
												<PageItemInput
													id={page.id}
													name={page.name}
													isCurrentPage={isCurrentPage}
													onComplete={() => {
														setEditingPageId(null)
														stepOffConvertedDivider(page.id)
													}}
													onCancel={() => setEditingPageId(null)}
												/>
											</div>
										) : (
											<>
												{shouldUseDragHandle && (
													<TldrawUiButton
														type="icon"
														className="tlui-page-menu__item__drag-handle"
														data-testid="page-menu.item-drag-handle"
														data-id={page.id}
														data-index={index}
														data-drag-handle="true"
														onPointerDown={handlePointerDown}
														onPointerMove={handlePointerMove}
														onPointerUp={handlePointerUp}
														onPointerCancel={handlePointerCancel}
														onKeyDown={handleKeyDown}
														tooltip={msg('context-menu.reorder')}
														title={msg('context-menu.reorder')}
													>
														<TldrawUiButtonIcon icon="drag-handle-dots" small />
													</TldrawUiButton>
												)}
												{isDivider ? (
													// Dividers cannot be selected or renamed; they can
													// only be dragged to reorder or managed via the
													// submenu.
													<TldrawUiButton
														type="normal"
														className="tlui-page-menu__item__button"
														onClick={() => {
															// Keep the drag state machine consistent, but
															// never navigate to a divider.
															rMutables.current.justDragged = false
														}}
														onPointerDown={
															isReadonlyMode || shouldUseDragHandle ? undefined : handlePointerDown
														}
														onPointerMove={
															isReadonlyMode || shouldUseDragHandle ? undefined : handlePointerMove
														}
														onPointerUp={
															isReadonlyMode || shouldUseDragHandle ? undefined : handlePointerUp
														}
														onPointerCancel={
															isReadonlyMode || shouldUseDragHandle
																? undefined
																: handlePointerCancel
														}
														aria-label={pageDividerLbl}
														data-id={page.id}
														data-index={index}
														onKeyDown={handleKeyDown}
													>
														<div className={styles.dividerLine} aria-hidden="true" />
													</TldrawUiButton>
												) : (
													<TldrawUiButton
														type="normal"
														className="tlui-page-menu__item__button"
														onClick={() => {
															if (rMutables.current.justDragged) {
																rMutables.current.justDragged = false
																return
															}
															changePage(page.id)
														}}
														onDoubleClick={() => startRenamingPage(page.id, page.name)}
														onPointerDown={
															isReadonlyMode || shouldUseDragHandle ? undefined : handlePointerDown
														}
														onPointerMove={
															isReadonlyMode || shouldUseDragHandle ? undefined : handlePointerMove
														}
														onPointerUp={
															isReadonlyMode || shouldUseDragHandle ? undefined : handlePointerUp
														}
														onPointerCancel={
															isReadonlyMode || shouldUseDragHandle
																? undefined
																: handlePointerCancel
														}
														tooltip={msg('page-menu.go-to-page')}
														title={msg('page-menu.go-to-page')}
														data-id={page.id}
														data-index={index}
														onKeyDown={(e) => {
															if (e.key === 'Escape') {
																handleKeyDown(e)
																return
															}
															if (e.key === 'Enter' && isCurrentPage) {
																startRenamingPage(page.id, page.name)
																editor.markEventAsHandled(e)
															}
														}}
													>
														<TldrawUiButtonLabel>{page.name}</TldrawUiButtonLabel>
													</TldrawUiButton>
												)}
											</>
										)}
										{!isReadonlyMode && !isRenamingThisPage && (
											<div className="tlui-page-menu__item__submenu">
												<TlaPageItemSubmenu
													index={index}
													item={page}
													listSize={pages.length}
													isDivider={isDivider}
													onRename={
														isDivider ? undefined : () => startRenamingPage(page.id, page.name)
													}
												/>
											</div>
										)}
									</div>
								)
							})}
						</div>
					</div>
					<div
						className="tlui-page-menu__resize-handle"
						data-resizing={isResizing}
						onPointerDown={handleResizePointerDown}
						onDoubleClick={handleResizeDoubleClick}
						role="separator"
						aria-orientation="horizontal"
						aria-label={msg('page-menu.resize')}
					/>
					<TldrawUiButton
						type="menu"
						className="tlui-page-menu__create-button"
						data-testid="page-menu.create"
						tooltip={createPageButtonLabel}
						title={createPageButtonLabel}
						disabled={isReadonlyMode || hasReachedMaxPages}
						onClick={handleCreatePageClick}
					>
						<TldrawUiButtonLabel>{createPageButtonLabel}</TldrawUiButtonLabel>
						{!hasReachedMaxPages && <TldrawUiButtonIcon icon="plus" small />}
					</TldrawUiButton>
				</div>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
})
