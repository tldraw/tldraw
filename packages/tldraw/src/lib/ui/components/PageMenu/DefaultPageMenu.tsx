import {
	PageRecordType,
	TLPageId,
	releasePointerCapture,
	setPointerCapture,
	tlenv,
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
import { TldrawUiButtonCheck } from '../primitives/Button/TldrawUiButtonCheck'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { TldrawUiRow } from '../primitives/layout'
import { PageItemInput } from './PageItemInput'
import { PageItemSubmenu } from './PageItemSubmenu'
import { onMovePage } from './edit-pages-shared'

/** @public @react */
export const DefaultPageMenu = memo(function DefaultPageMenu() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const handleOpenChange = useCallback(() => setIsEditing(false), [])

	const [isOpen, onOpenChange] = useMenuIsOpen('page-menu', handleOpenChange)

	const ITEM_HEIGHT = 36

	const rSortableContainer = useRef<HTMLDivElement>(null)

	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPage = useValue('currentPage', () => editor.getCurrentPage(), [editor])
	const currentPageId = useValue('currentPageId', () => editor.getCurrentPageId(), [editor])

	// When in readonly mode, we don't allow a user to edit the pages
	const isReadonlyMode = useReadonly()

	// If the user has reached the max page count, we disable the "add page" button
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

	// The component has an "editing state" that may be toggled to expose additional controls
	const [isEditing, setIsEditing] = useState(false)

	useEffect(
		function closePageMenuOnEnterPressAfterPressingEnterToConfirmRename() {
			function handleKeyDown() {
				if (isEditing) return
				if (document.activeElement === document.body) {
					editor.menus.clearOpenMenus()
				}
			}

			document.addEventListener('keydown', handleKeyDown, { passive: true })
			return () => {
				document.removeEventListener('keydown', handleKeyDown)
			}
		},
		[editor, isEditing]
	)

	const toggleEditing = useCallback(() => {
		if (isReadonlyMode) return
		setIsEditing((s) => !s)
	}, [isReadonlyMode])

	const rMutables = useRef({
		isPointing: false,
		status: 'idle' as 'idle' | 'pointing' | 'dragging',
		pointing: null as { id: string; index: number } | null,
		startY: 0,
		startIndex: 0,
		dragIndex: 0,
	})

	const [sortablePositionItems, setSortablePositionItems] = useState(
		Object.fromEntries(
			pages.map((page, i) => [page.id, { y: i * ITEM_HEIGHT, offsetY: 0, isSelected: false }])
		)
	)

	// Update the sortable position items when the pages change
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
			const elm = document.querySelector(`[data-pageid="${currentPageId}"]`) as HTMLDivElement

			if (elm) {
				elm.querySelector('button')?.focus()

				const container = rSortableContainer.current
				if (!container) return
				// Scroll into view is slightly borked on iOS Safari

				// if top of less than top cuttoff, scroll into view at top
				const elmTopPosition = elm.offsetTop
				const containerScrollTopPosition = container.scrollTop
				if (elmTopPosition < containerScrollTopPosition) {
					container.scrollTo({ top: elmTopPosition })
				}
				// if bottom position is greater than bottom cutoff, scroll into view at bottom
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
			}

			releasePointerCapture(e.currentTarget, e)
			mut.status = 'idle'
		},
		[editor, trackEvent]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLButtonElement>) => {
			const mut = rMutables.current
			// bail on escape
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

	const handleCreatePageClick = useCallback(() => {
		if (isReadonlyMode) return

		editor.run(() => {
			editor.markHistoryStoppingPoint('creating page')
			const newPageId = PageRecordType.createId()
			editor.createPage({ name: msg('page-menu.new-page-initial-name'), id: newPageId })
			editor.setCurrentPage(newPageId)

			setIsEditing(true)

			editor.timers.requestAnimationFrame(() => {
				const elm = document.querySelector(`[data-pageid="${newPageId}"]`) as HTMLDivElement

				if (elm) {
					elm.querySelector('button')?.focus()
				}
			})
		})
		trackEvent('new-page', { source: 'page-menu' })
	}, [editor, msg, isReadonlyMode, trackEvent])

	const changePage = useCallback(
		(id: TLPageId) => {
			editor.setCurrentPage(id)
			trackEvent('change-page', { source: 'page-menu' })
		},
		[editor, trackEvent]
	)

	const renamePage = useCallback(
		(id: TLPageId, name: string) => {
			editor.renamePage(id, name)
			trackEvent('rename-page', { source: 'page-menu' })
		},
		[editor, trackEvent]
	)

	return (
		<TldrawUiPopover id="pages" onOpenChange={onOpenChange} open={isOpen}>
			<TldrawUiPopoverTrigger data-testid="main.page-menu">
				<TldrawUiButton
					type="menu"
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
				disableEscapeKeyDown={isEditing}
			>
				<div className="tlui-page-menu__wrapper">
					<div className="tlui-page-menu__header">
						<div className="tlui-page-menu__header__title">{msg('page-menu.title')}</div>
						{!isReadonlyMode && (
							<TldrawUiRow>
								<TldrawUiButton
									type="icon"
									data-testid="page-menu.edit"
									title={msg(isEditing ? 'page-menu.edit-done' : 'page-menu.edit-start')}
									onClick={toggleEditing}
								>
									<TldrawUiButtonIcon icon={isEditing ? 'check' : 'edit'} />
								</TldrawUiButton>
								<TldrawUiButton
									type="icon"
									data-testid="page-menu.create"
									title={msg(
										maxPageCountReached
											? 'page-menu.max-page-count-reached'
											: 'page-menu.create-new-page'
									)}
									disabled={maxPageCountReached}
									onClick={handleCreatePageClick}
								>
									<TldrawUiButtonIcon icon="plus" />
								</TldrawUiButton>
							</TldrawUiRow>
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
								position: index * 40,
								offsetY: 0,
							}

							return isEditing ? (
								<div
									key={page.id + '_editing'}
									data-testid="page-menu.item"
									data-pageid={page.id}
									className="tlui-page_menu__item__sortable"
									style={{
										zIndex: page.id === currentPage.id ? 888 : index,
										transform: `translate(0px, ${position.y + position.offsetY}px)`,
									}}
								>
									<TldrawUiButton
										type="icon"
										tabIndex={-1}
										className="tlui-page_menu__item__sortable__handle"
										onPointerDown={handlePointerDown}
										onPointerUp={handlePointerUp}
										onPointerMove={handlePointerMove}
										onKeyDown={handleKeyDown}
										data-id={page.id}
										data-index={index}
									>
										<TldrawUiButtonIcon icon="drag-handle-dots" />
									</TldrawUiButton>
									{breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM && isCoarsePointer ? (
										// sigh, this is a workaround for iOS Safari
										// because the device and the radix popover seem
										// to be fighting over scroll position. Nothing
										// else seems to work!
										<TldrawUiButton
											type="normal"
											className="tlui-page-menu__item__button"
											onClick={() => {
												const name = window.prompt('Rename page', page.name)
												if (name && name !== page.name) {
													renamePage(page.id, name)
												}
											}}
											onDoubleClick={toggleEditing}
										>
											<TldrawUiButtonCheck checked={page.id === currentPage.id} />
											<TldrawUiButtonLabel>{page.name}</TldrawUiButtonLabel>
										</TldrawUiButton>
									) : (
										<div
											className="tlui-page_menu__item__sortable__title"
											style={{ height: ITEM_HEIGHT }}
										>
											<PageItemInput
												id={page.id}
												name={page.name}
												isCurrentPage={page.id === currentPage.id}
												onComplete={() => {
													setIsEditing(false)
												}}
												onCancel={() => {
													setIsEditing(false)
												}}
											/>
										</div>
									)}
									{!isReadonlyMode && (
										<div className="tlui-page_menu__item__submenu" data-isediting={isEditing}>
											<PageItemSubmenu index={index} item={page} listSize={pages.length} />
										</div>
									)}
								</div>
							) : (
								<div
									key={page.id}
									data-pageid={page.id}
									data-testid="page-menu.item"
									className="tlui-page-menu__item"
								>
									<TldrawUiButton
										type="normal"
										className="tlui-page-menu__item__button"
										onClick={() => changePage(page.id)}
										onDoubleClick={toggleEditing}
										title={msg('page-menu.go-to-page')}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												if (page.id === currentPage.id) {
													toggleEditing()
													editor.markEventAsHandled(e)
												}
											}
										}}
									>
										<TldrawUiButtonCheck checked={page.id === currentPage.id} />
										<TldrawUiButtonLabel>{page.name}</TldrawUiButtonLabel>
									</TldrawUiButton>
									{!isReadonlyMode && (
										<div className="tlui-page_menu__item__submenu">
											<PageItemSubmenu
												index={index}
												item={page}
												listSize={pages.length}
												onRename={() => {
													if (tlenv.isIos) {
														const name = window.prompt('Rename page', page.name)
														if (name && name !== page.name) {
															renamePage(page.id, name)
														}
													} else {
														setIsEditing(true)
														if (currentPageId !== page.id) {
															changePage(page.id)
														}
													}
												}}
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
