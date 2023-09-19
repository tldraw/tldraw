import {
	MAX_PAGES,
	PageRecordType,
	TLPageId,
	releasePointerCapture,
	setPointerCapture,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useReadonly } from '../../hooks/useReadonly'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import { Icon } from '../primitives/Icon'
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover'
import { PageItemInput } from './PageItemInput'
import { PageItemSubmenu } from './PageItemSubmenu'
import { onMovePage } from './edit-pages-shared'

export const PageMenu = function PageMenu() {
	const editor = useEditor()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const handleOpenChange = useCallback(() => setIsEditing(false), [])

	const [isOpen, onOpenChange] = useMenuIsOpen('page-menu', handleOpenChange)

	const ITEM_HEIGHT = breakpoint < 5 ? 36 : 40

	const rSortableContainer = useRef<HTMLDivElement>(null)

	const pages = useValue('pages', () => editor.pages, [editor])
	const currentPage = useValue('currentPage', () => editor.currentPage, [editor])
	const currentPageId = useValue('currentPageId', () => editor.currentPageId, [editor])

	// When in readonly mode, we don't allow a user to edit the pages
	const isReadonlyMode = useReadonly()

	// If the user has reached the max page count, we disable the "add page" button
	const maxPageCountReached = useValue(
		'maxPageCountReached',
		() => editor.pages.length >= MAX_PAGES,
		[editor]
	)

	const isCoarsePointer = useValue('isCoarsePointer', () => editor.instanceState.isCoarsePointer, [
		editor,
	])

	// The component has an "editing state" that may be toggled to expose additional controls
	const [isEditing, setIsEditing] = useState(false)

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
		requestAnimationFrame(() => {
			const elm = document.querySelector(
				`[data-testid="page-menu-item-${currentPageId}"]`
			) as HTMLDivElement

			if (elm) {
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
	}, [ITEM_HEIGHT, currentPageId, isOpen])

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
				onMovePage(editor, id as TLPageId, index, mut.dragIndex)
			}

			releasePointerCapture(e.currentTarget, e)
			mut.status = 'idle'
		},
		[editor]
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

		editor.batch(() => {
			editor.mark('creating page')
			const newPageId = PageRecordType.createId()
			editor.createPage({ name: msg('page-menu.new-page-initial-name'), id: newPageId })
			editor.setCurrentPage(newPageId)
			setIsEditing(true)
		})
	}, [editor, msg, isReadonlyMode])

	return (
		<Popover id="page menu" onOpenChange={onOpenChange} open={isOpen}>
			<PopoverTrigger>
				<Button
					className="tlui-page-menu__trigger tlui-menu__trigger"
					data-testid="main.page-menu"
					icon="chevron-down"
					title={currentPage.name}
				>
					<div className="tlui-page-menu__name">{currentPage.name}</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent side="bottom" align="start" sideOffset={6}>
				<div className="tlui-page-menu__wrapper">
					<div className="tlui-page-menu__header">
						<div className="tlui-page-menu__header__title">{msg('page-menu.title')}</div>
						{!isReadonlyMode && (
							<>
								<Button
									data-testid="page-menu.edit"
									title={msg(isEditing ? 'page-menu.edit-done' : 'page-menu.edit-start')}
									icon={isEditing ? 'check' : 'edit'}
									onClick={toggleEditing}
								/>
								<Button
									data-testid="page-menu.create"
									icon="plus"
									title={msg(
										maxPageCountReached
											? 'page-menu.max-page-count-reached'
											: 'page-menu.create-new-page'
									)}
									disabled={maxPageCountReached}
									onClick={handleCreatePageClick}
								/>
							</>
						)}
					</div>
					<div
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
									data-testid={`page-menu-item-${page.id}`}
									className="tlui-page_menu__item__sortable"
									style={{
										zIndex: page.id === currentPage.id ? 888 : index,
										transform: `translate(0px, ${position.y + position.offsetY}px)`,
									}}
								>
									<Button
										tabIndex={-1}
										className="tlui-page_menu__item__sortable__handle"
										icon="drag-handle-dots"
										onPointerDown={handlePointerDown}
										onPointerUp={handlePointerUp}
										onPointerMove={handlePointerMove}
										onKeyDown={handleKeyDown}
										data-id={page.id}
										data-index={index}
									/>
									{breakpoint < 5 && isCoarsePointer ? (
										// sigh, this is a workaround for iOS Safari
										// because the device and the radix popover seem
										// to be fighting over scroll position. Nothing
										// else seems to work!
										<Button
											className="tlui-page-menu__item__button"
											onClick={() => {
												const name = window.prompt('Rename page', page.name)
												if (name && name !== page.name) {
													editor.renamePage(page.id, name)
												}
											}}
											onDoubleClick={toggleEditing}
											isChecked={page.id === currentPage.id}
										>
											<span>{page.name}</span>
										</Button>
									) : (
										<div
											className="tlui-page_menu__item__sortable__title"
											style={{ height: ITEM_HEIGHT }}
										>
											<PageItemInput
												id={page.id}
												name={page.name}
												isCurrentPage={page.id === currentPage.id}
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
									data-testid={`page-menu-item-${page.id}`}
									className="tlui-page-menu__item"
								>
									<Button
										className="tlui-page-menu__item__button tlui-page-menu__item__button__checkbox"
										onClick={() => editor.setCurrentPage(page.id)}
										onDoubleClick={toggleEditing}
										isChecked={page.id === currentPage.id}
										title={msg('page-menu.go-to-page')}
									>
										<div className="tlui-page-menu__item__button__check">
											{page.id === currentPage.id && <Icon icon="check" />}
										</div>
										<span>{page.name}</span>
									</Button>
									{!isReadonlyMode && (
										<div className="tlui-page_menu__item__submenu">
											<PageItemSubmenu
												index={index}
												item={page}
												listSize={pages.length}
												onRename={() => {
													if (editor.environment.isIos) {
														const name = window.prompt('Rename page', page.name)
														if (name && name !== page.name) {
															editor.renamePage(page.id, name)
														}
													} else {
														editor.batch(() => {
															setIsEditing(true)
															editor.setCurrentPage(page.id)
														})
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
			</PopoverContent>
		</Popover>
	)
}
