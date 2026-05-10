import {
	PageRecordType,
	TLPageId,
	releasePointerCapture,
	setPointerCapture,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
		isPointing: false,
		status: 'idle' as 'idle' | 'pointing' | 'dragging',
		pointing: null as { id: string; index: number } | null,
		startY: 0,
		startIndex: 0,
		dragIndex: 0,
		// Set true on pointer-up after a drag, so the synthetic click that
		// follows pointer-up doesn't also navigate to the dragged page.
		justDragged: false,
	})

	// Which page (if any) is currently being dragged. Used to apply the
	// grabbing cursor only during an active drag — never on hover.
	const [draggingPageId, setDraggingPageId] = useState<TLPageId | null>(null)

	const [sortablePositionItems, setSortablePositionItems] = useState(
		Object.fromEntries(
			pages.map((page, i) => [page.id, { y: i * ITEM_HEIGHT, offsetY: 0, isSelected: false }])
		)
	)

	useLayoutEffect(() => {
		setSortablePositionItems(
			Object.fromEntries(
				pages.map((page, i) => [page.id, { y: i * ITEM_HEIGHT, offsetY: 0, isSelected: false }])
			)
		)
	}, [ITEM_HEIGHT, pages])

	// Scroll the current page into view when the menu opens / when current page changes
	useEffect(() => {
		if (!isOpen) return
		editor.timers.requestAnimationFrame(() => {
			const doc = editor.getContainerDocument()
			const elm = doc.querySelector(`[data-pageid="${currentPageId}"]`) as HTMLDivElement

			if (elm) {
				;(
					elm.querySelector('button.tlui-page-menu__item__button') as HTMLButtonElement | null
				)?.focus()

				const container = rSortableContainer.current
				if (!container) return
				// Scroll into view is slightly borked on iOS Safari

				const elmTopPosition = elm.offsetTop
				const containerScrollTopPosition = container.scrollTop
				if (elmTopPosition < containerScrollTopPosition) {
					container.scrollTo({ top: elmTopPosition })
				}
				const elmBottomPosition = elmTopPosition + ITEM_HEIGHT
				const containerScrollBottomPosition = container.scrollTop + container.offsetHeight
				if (elmBottomPosition > containerScrollBottomPosition) {
					container.scrollTo({ top: elmBottomPosition - container.offsetHeight })
				}
			}
		})
	}, [ITEM_HEIGHT, currentPageId, isOpen, editor])

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			const { clientY, currentTarget } = e
			const {
				dataset: { id, index },
			} = currentTarget

			if (!id || !index) return

			const mut = rMutables.current

			setPointerCapture(e.currentTarget, e)

			mut.status = 'pointing'
			mut.pointing = { id, index: +index! }
			const current = sortablePositionItems[id]
			const dragY = current.y

			mut.startY = clientY
			mut.startIndex = Math.max(0, Math.min(Math.round(dragY / ITEM_HEIGHT), pages.length - 1))
		},
		[ITEM_HEIGHT, pages.length, sortablePositionItems]
	)

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			const mut = rMutables.current
			if (mut.status === 'pointing') {
				const { clientY } = e
				const offset = clientY - mut.startY
				if (Math.abs(offset) > 5) {
					mut.status = 'dragging'
					setDraggingPageId(mut.pointing!.id as TLPageId)
				}
			}

			if (mut.status === 'dragging') {
				const { clientY } = e
				const offsetY = clientY - mut.startY
				const current = sortablePositionItems[mut.pointing!.id]

				const { startIndex, pointing } = mut
				const dragY = current.y + offsetY
				const dragIndex = Math.max(0, Math.min(Math.round(dragY / ITEM_HEIGHT), pages.length - 1))

				const next = { ...sortablePositionItems }
				next[pointing!.id] = {
					y: current.y,
					offsetY,
					isSelected: true,
				}

				if (dragIndex !== mut.dragIndex) {
					mut.dragIndex = dragIndex

					for (let i = 0; i < pages.length; i++) {
						const item = pages[i]
						if (item.id === mut.pointing!.id) {
							continue
						}

						let { y } = next[item.id]

						if (dragIndex === startIndex) {
							y = i * ITEM_HEIGHT
						} else if (dragIndex < startIndex) {
							if (dragIndex <= i && i < startIndex) {
								y = (i + 1) * ITEM_HEIGHT
							} else {
								y = i * ITEM_HEIGHT
							}
						} else if (dragIndex > startIndex) {
							if (dragIndex >= i && i > startIndex) {
								y = (i - 1) * ITEM_HEIGHT
							} else {
								y = i * ITEM_HEIGHT
							}
						}

						if (y !== next[item.id].y) {
							next[item.id] = { y, offsetY: 0, isSelected: true }
						}
					}
				}

				setSortablePositionItems(next)
			}
		},
		[ITEM_HEIGHT, pages, sortablePositionItems]
	)

	const handlePointerUp = useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			const mut = rMutables.current

			if (mut.status === 'dragging') {
				const { id, index } = mut.pointing!
				onMovePage(editor, id as TLPageId, index, mut.dragIndex, trackEvent)
				mut.justDragged = true
			}

			releasePointerCapture(e.currentTarget, e)
			mut.status = 'idle'
			setDraggingPageId(null)
		},
		[editor, trackEvent]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLButtonElement>) => {
			const mut = rMutables.current
			if (e.key === 'Escape') {
				if (mut.status === 'dragging') {
					setSortablePositionItems(
						Object.fromEntries(
							pages.map((page, i) => [
								page.id,
								{ y: i * ITEM_HEIGHT, offsetY: 0, isSelected: false },
							])
						)
					)
				}

				mut.status = 'idle'
			}
		},
		[ITEM_HEIGHT, pages]
	)

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
							const position = sortablePositionItems[page.id] ?? {
								y: index * ITEM_HEIGHT,
								offsetY: 0,
							}
							const isCurrentPage = page.id === currentPage.id
							const isRenamingThisPage = editingPageId === page.id

							return (
								<div
									key={page.id}
									data-pageid={page.id}
									data-testid="page-menu.item"
									data-iscurrent={isCurrentPage}
									data-dragging={draggingPageId === page.id}
									className="tlui-page_menu__item__sortable"
									style={{
										zIndex: isCurrentPage ? 888 : index,
										transform: `translate(0px, ${position.y + position.offsetY}px)`,
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
									{!isReadonlyMode && (
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
