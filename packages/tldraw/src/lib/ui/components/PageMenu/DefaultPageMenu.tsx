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

/** @public @react */
export const DefaultPageMenu = memo(function DefaultPageMenu() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const handleOpenChange = useCallback(() => setEditingPageId(null), [])

	const [isOpen, onOpenChange] = useMenuIsOpen('page-menu', handleOpenChange)

	const ITEM_HEIGHT = 36
	const DRAG_THRESHOLD = 5
	// During a drag, scroll speed ramps linearly from MIN to MAX. The ramp
	// starts when the cursor enters AUTO_SCROLL_ZONE pixels from the edge
	// (slow drift) and reaches MAX once the cursor is AUTO_SCROLL_RAMP_DISTANCE
	// pixels into the overshoot — i.e. AUTO_SCROLL_RAMP_DISTANCE − AUTO_SCROLL_ZONE
	// pixels past the edge of the container.
	const AUTO_SCROLL_ZONE = 16
	const AUTO_SCROLL_RAMP_DISTANCE = 48
	const MIN_AUTO_SCROLL_SPEED = 1
	const MAX_AUTO_SCROLL_SPEED = 6

	const rSortableContainer = useRef<HTMLDivElement>(null)

	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPage = useValue('currentPage', () => editor.getCurrentPage(), [editor])
	const currentPageId = useValue('currentPageId', () => editor.getCurrentPageId(), [editor])

	const isReadonlyMode = useReadonly()

	const maxPageCountReached = useValue(
		'maxPageCountReached',
		() => editor.getPages().length >= editor.options.maxPages,
		[editor]
	)

	const isCoarsePointer = useValue(
		'isCoarsePointer',
		() => editor.getInstanceState().isCoarsePointer,
		[editor]
	)

	// The id of the page currently being renamed inline, if any.
	const [editingPageId, setEditingPageId] = useState<TLPageId | null>(null)

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
			const currentIndex = editor.getPages().findIndex((p) => p.id === currentPageId)
			if (currentIndex === -1) return

			const doc = editor.getContainerDocument()
			const elm = doc.querySelector(`[data-pageid="${currentPageId}"]`) as HTMLDivElement | null
			elm?.querySelector<HTMLButtonElement>('button.tlui-page-menu__item__button')?.focus()

			const elmTop = currentIndex * ITEM_HEIGHT
			const elmBottom = elmTop + ITEM_HEIGHT
			const viewTop = container.scrollTop
			const viewBottom = viewTop + container.clientHeight
			if (elmTop < viewTop) {
				container.scrollTo({ top: elmTop })
			} else if (elmBottom > viewBottom) {
				container.scrollTo({ top: elmBottom - container.clientHeight })
			}
		})
	}, [ITEM_HEIGHT, currentPageId, isOpen, editor])

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
			const maxDragY = (pages.length - 1) * ITEM_HEIGHT
			const dragY = Math.max(
				minDragY,
				Math.min(maxDragY, mut.startIndex * ITEM_HEIGHT + rawOffsetY)
			)
			const offsetY = dragY - mut.startIndex * ITEM_HEIGHT
			const dragIndex = Math.max(0, Math.min(Math.round(dragY / ITEM_HEIGHT), pages.length - 1))
			mut.dragIndex = dragIndex
			mut.lastClientY = clientY
			setDragState({ id: mut.id, startIndex: mut.startIndex, dragIndex, offsetY })
		},
		[ITEM_HEIGHT, pages.length]
	)

	// While a drag is in progress, follow the container's scroll so the
	// dragged row stays under the cursor when the user scrolls the list
	// (wheel, trackpad, scrollbar). Re-runs updateDragFromPointer with the
	// last known clientY; the new scrollTop falls out of the offset math.
	// Idempotent — safe even when our own auto-scroll also calls it.
	useEffect(() => {
		if (!isOpen) return
		const container = rSortableContainer.current
		if (!container) return
		function onScroll() {
			const mut = rMutables.current
			if (mut.status !== 'dragging') return
			updateDragFromPointer(mut.lastClientY)
		}
		container.addEventListener('scroll', onScroll, { passive: true })
		return () => container.removeEventListener('scroll', onScroll)
	}, [isOpen, updateDragFromPointer])

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
		// `overshoot` is 0 at the inner edge of AUTO_SCROLL_ZONE and grows
		// as the cursor approaches and passes the edge of the container.
		const overshootTop = AUTO_SCROLL_ZONE - fromTop
		const overshootBottom = AUTO_SCROLL_ZONE - fromBottom
		let dy = 0
		if (overshootTop > 0 && container.scrollTop > 0) {
			const t = Math.min(1, overshootTop / AUTO_SCROLL_RAMP_DISTANCE)
			const speed = MIN_AUTO_SCROLL_SPEED + (MAX_AUTO_SCROLL_SPEED - MIN_AUTO_SCROLL_SPEED) * t
			dy = -Math.ceil(speed)
		} else if (overshootBottom > 0 && container.scrollTop < maxScroll) {
			const t = Math.min(1, overshootBottom / AUTO_SCROLL_RAMP_DISTANCE)
			const speed = MIN_AUTO_SCROLL_SPEED + (MAX_AUTO_SCROLL_SPEED - MIN_AUTO_SCROLL_SPEED) * t
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

		const mut = rMutables.current
		setPointerCapture(currentTarget, e)
		mut.status = 'pointing'
		mut.id = id as TLPageId
		mut.startIndex = +index
		mut.dragIndex = +index
		mut.startY = clientY
		mut.lastClientY = clientY
		mut.startScrollTop = rSortableContainer.current?.scrollTop ?? 0
	}, [])

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			const mut = rMutables.current
			const { clientY } = e
			if (mut.status === 'pointing') {
				if (Math.abs(clientY - mut.startY) <= DRAG_THRESHOLD) return
				mut.status = 'dragging'
				mut.lastClientY = clientY
				ensureAutoScrollLoop()
			}
			if (mut.status === 'dragging') {
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
				mut.justDragged = true
			}
			releasePointerCapture(e.currentTarget, e)
			mut.status = 'idle'
			mut.id = null
			setDragState(null)
		},
		[editor, trackEvent]
	)

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
		const mut = rMutables.current
		// Pointer capture is naturally released on the eventual pointer up,
		// at which point the idle status makes the up handler a no-op.
		if (e.key === 'Escape' && mut.status !== 'idle') {
			mut.status = 'idle'
			mut.id = null
			setDragState(null)
		}
	}, [])

	const shouldUseWindowPrompt = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM && isCoarsePointer

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

		editor.run(() => {
			editor.markHistoryStoppingPoint('creating page')
			editor.createPage({ name: initialName, id: newPageId })
			editor.setCurrentPage(newPageId)
		})

		startRenamingPage(newPageId, initialName)
		trackEvent('new-page', { source: 'page-menu' })
	}, [editor, msg, isReadonlyMode, startRenamingPage, trackEvent])

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
					<div className="tlui-page-menu__name">{currentPage.name}</div>
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
					<div className="tlui-page-menu__header">
						<div className="tlui-page-menu__header__title">{msg('page-menu.title')}</div>
						{!isReadonlyMode && (
							<TldrawUiButton
								type="icon"
								data-testid="page-menu.create"
								tooltip={msg(
									maxPageCountReached
										? 'page-menu.max-page-count-reached'
										: 'page-menu.create-new-page'
								)}
								title={msg(
									maxPageCountReached
										? 'page-menu.max-page-count-reached'
										: 'page-menu.create-new-page'
								)}
								disabled={maxPageCountReached}
								onClick={handleCreatePageClick}
							>
								<TldrawUiButtonIcon icon="plus" small />
							</TldrawUiButton>
						)}
					</div>
					<div
						data-testid="page-menu.list"
						className="tlui-page-menu__list tlui-menu__group"
						style={{ height: ITEM_HEIGHT * pages.length + 4 }}
						ref={rSortableContainer}
					>
						{pages.map((page, index) => {
							const isCurrentPage = page.id === currentPage.id
							const isRenamingThisPage = editingPageId === page.id
							const isDragging = dragState?.id === page.id

							let y = index * ITEM_HEIGHT
							if (dragState) {
								if (isDragging) {
									y = dragState.startIndex * ITEM_HEIGHT + dragState.offsetY
								} else {
									const { startIndex, dragIndex } = dragState
									if (dragIndex < startIndex && index >= dragIndex && index < startIndex) {
										y = (index + 1) * ITEM_HEIGHT
									} else if (dragIndex > startIndex && index > startIndex && index <= dragIndex) {
										y = (index - 1) * ITEM_HEIGHT
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
									className="tlui-page_menu__item__sortable"
									style={{
										zIndex: isCurrentPage ? 888 : index,
										transform: `translate(0px, ${y}px)`,
									}}
								>
									{isRenamingThisPage ? (
										<div className="tlui-page_menu__item__sortable__title" style={{ height: 40 }}>
											<PageItemInput
												id={page.id}
												name={page.name}
												isCurrentPage={isCurrentPage}
												onComplete={() => setEditingPageId(null)}
												onCancel={() => setEditingPageId(null)}
											/>
										</div>
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
											onPointerDown={isReadonlyMode ? undefined : handlePointerDown}
											onPointerMove={isReadonlyMode ? undefined : handlePointerMove}
											onPointerUp={isReadonlyMode ? undefined : handlePointerUp}
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
									{!isReadonlyMode && !isRenamingThisPage && (
										<div className="tlui-page_menu__item__submenu">
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
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
})
