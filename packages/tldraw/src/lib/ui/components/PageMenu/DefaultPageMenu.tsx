import {
	PageRecordType,
	TLPageId,
	releasePointerCapture,
	setPointerCapture,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useUiEvents } from '../../context/events'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useReadonly } from '../../hooks/useReadonly'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { onMovePage } from './edit-pages-shared'
import { PageItemInput } from './PageItemInput'
import { PageItemSubmenu } from './PageItemSubmenu'

const PAGE_MENU_LIST_HEIGHT_KEY = 'tldraw_page_menu_list_height'
const MIN_PAGE_MENU_LIST_HEIGHT = 54
const MAX_PAGE_MENU_RENDER_HEIGHT = 800
// Bottom padding included in the absolutely-positioned content stack — so the
// auto-fit list height should mirror it.
const PAGE_MENU_LIST_CONTENT_BOTTOM_PADDING = 4
const MAX_PAGE_MENU_AVAILABLE_HEIGHT_RATIO = 0.62
const PAGE_MENU_CREATE_BUTTON_HEIGHT = 40
const PAGE_MENU_RESIZE_HANDLE_HEIGHT = 7
const PAGE_MENU_ITEM_HEIGHT = 36
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

function getPageMenuRenderCap(availableHeight: number, hasFooter: boolean): number {
	const maxMenuHeight = Math.min(
		MAX_PAGE_MENU_RENDER_HEIGHT,
		availableHeight * MAX_PAGE_MENU_AVAILABLE_HEIGHT_RATIO
	)
	const footerHeight = hasFooter
		? PAGE_MENU_CREATE_BUTTON_HEIGHT + PAGE_MENU_RESIZE_HANDLE_HEIGHT
		: 0
	return Math.max(MIN_PAGE_MENU_LIST_HEIGHT, maxMenuHeight - footerHeight)
}

/** @public @react */
export const DefaultPageMenu = memo(function DefaultPageMenu() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	// The id of the page currently being renamed inline, if any.
	const [editingPageId, setEditingPageId] = useState<TLPageId | null>(null)

	const handleOpenChange = useCallback(() => setEditingPageId(null), [])

	const [isOpen, onOpenChange] = useMenuIsOpen('page-menu', handleOpenChange)

	const rSortableContainer = useRef<HTMLDivElement>(null)

	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPage = useValue('currentPage', () => editor.getCurrentPage(), [editor])

	const isReadonlyMode = useReadonly()

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

	const renderCap = getPageMenuRenderCap(availableHeight, !isReadonlyMode)
	const autoFitListHeight =
		pages.length * PAGE_MENU_ITEM_HEIGHT + PAGE_MENU_LIST_CONTENT_BOTTOM_PADDING
	const renderedListHeight = Math.min(userListHeight ?? autoFitListHeight, renderCap)

	const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
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

			const elmTop = currentIndex * PAGE_MENU_ITEM_HEIGHT
			const elmBottom = elmTop + PAGE_MENU_ITEM_HEIGHT
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
	const updateDragFromPointer = useCallback(
		(clientY: number) => {
			const mut = rMutables.current
			if (mut.status !== 'dragging' || !mut.id) return
			const scrollTop = rSortableContainer.current?.scrollTop ?? 0
			// Offsets the cursor delta by any auto-scroll that has happened
			// since the drag started, so the row tracks the cursor as the
			// list scrolls underneath it.
			const rawOffsetY = clientY - mut.startY + (scrollTop - mut.startScrollTop)
			// Clamp the dragged row's visible position to the first/last slot
			// so its transform never extends the popover scroll area.
			const minDragY = 0
			const maxDragY = (pages.length - 1) * PAGE_MENU_ITEM_HEIGHT
			const dragY = Math.max(
				minDragY,
				Math.min(maxDragY, mut.startIndex * PAGE_MENU_ITEM_HEIGHT + rawOffsetY)
			)
			const offsetY = dragY - mut.startIndex * PAGE_MENU_ITEM_HEIGHT
			const dragIndex = Math.max(
				0,
				Math.min(Math.round(dragY / PAGE_MENU_ITEM_HEIGHT), pages.length - 1)
			)
			mut.dragIndex = dragIndex
			mut.lastClientY = clientY
			setDragState({ id: mut.id, startIndex: mut.startIndex, dragIndex, offsetY })
		},
		[pages.length]
	)

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

	const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
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
		(e: React.PointerEvent<HTMLButtonElement>) => {
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
		(e: React.PointerEvent<HTMLButtonElement>) => {
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

	const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
		const mut = rMutables.current
		releasePointerCapture(e.currentTarget, e)
		mut.status = 'idle'
		mut.id = null
		mut.startedOnDragHandle = false
		setDragState(null)
	}, [])

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
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

	const startRenamingPage = useCallback(
		(id: TLPageId, currentName: string) => {
			if (isReadonlyMode) return
			if (shouldUseWindowPrompt) {
				const name = window.prompt(msg('action.rename'), currentName)
				if (name && name !== currentName) {
					editor.renamePage(id, name)
					trackEvent('rename-page', { source: 'page-menu' })
				}
				return
			}
			setEditingPageId(id)
		},
		[editor, msg, isReadonlyMode, shouldUseWindowPrompt, trackEvent]
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
		}
		trackEvent('new-page', { source: 'page-menu' })
	}, [editor, msg, isReadonlyMode, shouldUseWindowPrompt, startRenamingPage, trackEvent])

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
							style={{ height: PAGE_MENU_ITEM_HEIGHT * pages.length + 4 }}
						>
							{pages.map((page, index) => {
								const isCurrentPage = page.id === currentPage.id
								const isRenamingThisPage = editingPageId === page.id
								const isDragging = dragState?.id === page.id

								let y = index * PAGE_MENU_ITEM_HEIGHT
								if (dragState) {
									if (isDragging) {
										y = dragState.startIndex * PAGE_MENU_ITEM_HEIGHT + dragState.offsetY
									} else {
										const { startIndex, dragIndex } = dragState
										if (dragIndex < startIndex && index >= dragIndex && index < startIndex) {
											y = (index + 1) * PAGE_MENU_ITEM_HEIGHT
										} else if (dragIndex > startIndex && index > startIndex && index <= dragIndex) {
											y = (index - 1) * PAGE_MENU_ITEM_HEIGHT
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
										className="tlui-page-menu__item"
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
													onComplete={() => setEditingPageId(null)}
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
														isReadonlyMode || shouldUseDragHandle ? undefined : handlePointerCancel
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
											</>
										)}
										{!isReadonlyMode && !isRenamingThisPage && (
											<div className="tlui-page-menu__item__submenu">
												<PageItemSubmenu
													index={index}
													item={page}
													listSize={pages.length}
													onRename={() => startRenamingPage(page.id, page.name)}
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
					{!isReadonlyMode && (
						<TldrawUiButton
							type="menu"
							className="tlui-page-menu__create-button"
							data-testid="page-menu.create"
							tooltip={msg('page-menu.create-new-page')}
							title={msg('page-menu.create-new-page')}
							disabled={pages.length >= editor.options.maxPages}
							onClick={handleCreatePageClick}
						>
							<TldrawUiButtonLabel>{msg('page-menu.create-new-page')}</TldrawUiButtonLabel>
							<TldrawUiButtonIcon icon="plus" small />
						</TldrawUiButton>
					)}
				</div>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
})
