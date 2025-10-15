import {
	activeElementShouldCaptureKeys,
	assert,
	modulate,
	preventDefault,
	tlmenus,
	useEditor,
	useEvent,
	useUniqueSafeId,
} from '@tldraw/editor'
import classNames from 'classnames'
import { createContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { areShortcutsDisabled } from '../../hooks/useKeyboardShortcuts'
import { TLUiToolItem } from '../../hooks/useTools'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { TldrawUiColumn, TldrawUiRow } from '../primitives/layout'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'

export const IsInOverflowContext = createContext(false)

const NUMBERED_SHORTCUT_KEYS: Record<string, number> = {
	'1': 0,
	'2': 1,
	'3': 2,
	'4': 3,
	'5': 4,
	'6': 5,
	'7': 6,
	'8': 7,
	'9': 8,
	'0': 9,
}

/** @public */
export interface OverflowingToolbarProps {
	children: React.ReactNode
	orientation: 'horizontal' | 'vertical'
	sizingParentClassName: string
	minItems: number
	minSizePx: number
	maxItems: number
	maxSizePx: number
}

/** @public @react */
export function OverflowingToolbar({
	children,
	orientation,
	sizingParentClassName,
	minItems,
	minSizePx,
	maxItems,
	maxSizePx,
}: OverflowingToolbarProps) {
	const editor = useEditor()
	const id = useUniqueSafeId()
	const breakpoint = useBreakpoint()
	const msg = useTranslation()
	const rButtons = useRef<HTMLElement[]>([])
	const [isOpen, setIsOpen] = useState(false)

	const mainToolsRef = useRef<HTMLDivElement>(null)

	// we have to use state instead of a ref here so that we get
	// an update when the overflow popover mounts / unmounts
	const [overflowTools, setOverflowTools] = useState<HTMLDivElement | null>(null)
	const [lastActiveOverflowItem, setLastActiveOverflowItem] = useState<string | null>(null)
	const [shouldShowOverflow, setShouldShowOverflow] = useState(false)

	const onDomUpdate = useEvent(() => {
		if (!mainToolsRef.current) return

		// whenever we get an update, we need to re-calculate the number of items to show and update
		// the component accordingly.
		const sizeProp = orientation === 'horizontal' ? 'offsetWidth' : 'offsetHeight'

		// toolbars can contain both single items and groups. we need to keep track of both.
		type Items = (
			| { type: 'item'; element: HTMLElement }
			| { type: 'group'; items: Items; element: HTMLElement }
		)[]

		// walk through the dom and collect items so we can calculate what to show/hide
		const mainItems = collectItems(mainToolsRef.current.children)
		const overflowItems = overflowTools ? collectItems(overflowTools.children) : null
		function collectItems(collection: HTMLCollection) {
			const items: Items = []
			for (const child of collection) {
				if (child.classList.contains('tlui-main-toolbar__group')) {
					items.push({
						type: 'group',
						items: collectItems(child.children),
						element: child as HTMLElement,
					})
				} else if (!child.hasAttribute('data-radix-popper-content-wrapper')) {
					items.push({ type: 'item', element: child as HTMLElement })
				}
			}

			return items
		}

		// the number of items to show is based on the space available to the toolbar.
		const sizingParent = findParentWithClassName(mainToolsRef.current, sizingParentClassName)
		const size = sizingParent[sizeProp]
		const itemsToShow = Math.floor(
			modulate(size, [minSizePx, maxSizePx], [minItems, maxItems], true)
		)

		// now we know how many items to show, we need to walk through the items we found and show /
		// hide them accordingly. We need to keep track of:
		// the number of item's we've shown in the main content so far
		let mainItemCount = 0
		// the item that is currently active in the overflow content (if any)
		let newActiveOverflowItem: string | null = null
		// whether the last active overflow item is actually still in the overflow content
		let shouldInvalidateLastActiveOverflowItem = false
		// the buttons visible in the main content
		const numberedButtons: HTMLButtonElement[] = []
		function visitItems(
			mainItems: Items,
			overflowItems: Items | null
		): {
			// for each group of items we visit, we need to know whether we showed anything in
			// either section
			didShowAnyInMain: boolean
			didShowAnyInOverflow: boolean
		} {
			if (overflowItems) assert(mainItems.length === overflowItems.length)

			let didShowAnyInMain = false
			let didShowAnyInOverflow = false

			for (let i = 0; i < mainItems.length; i++) {
				const mainItem = mainItems[i]
				const overflowItem = overflowItems?.[i]

				if (mainItem.type === 'item') {
					const isLastActiveOverflowItem =
						mainItem.element.getAttribute('data-value') === lastActiveOverflowItem

					// for single items, we show them in main if we have space, or if they're the
					// last-used item from the overflow.
					let shouldShowInMain
					if (lastActiveOverflowItem) {
						shouldShowInMain = mainItemCount < itemsToShow || isLastActiveOverflowItem
					} else {
						// we use <= here because if there is no last active overflow item, we want
						// to show at least one item in the main toolbar.
						shouldShowInMain = mainItemCount <= itemsToShow
					}
					const shouldShowInOverflow = mainItemCount >= itemsToShow

					didShowAnyInMain ||= shouldShowInMain
					didShowAnyInOverflow ||= shouldShowInOverflow

					setAttribute(
						mainItem.element,
						'data-toolbar-visible',
						shouldShowInMain ? 'true' : 'false'
					)
					if (overflowItem) {
						assert(overflowItem.type === 'item')
						setAttribute(
							overflowItem.element,
							'data-toolbar-visible',
							shouldShowInOverflow ? 'true' : 'false'
						)
					}
					if (shouldShowInOverflow && mainItem.element.getAttribute('aria-pressed') === 'true') {
						newActiveOverflowItem = mainItem.element.getAttribute('data-value')
					}
					if (shouldShowInMain && mainItem.element.tagName === 'BUTTON') {
						numberedButtons.push(mainItem.element as HTMLButtonElement)
					}
					if (!shouldShowInOverflow && isLastActiveOverflowItem) {
						shouldInvalidateLastActiveOverflowItem = true
					}
					mainItemCount++
				} else {
					// for groups, we show them in main if we have space, or if they're the
					// last-used item from the overflow.
					let result, overflowGroup
					if (overflowItem) {
						assert(overflowItem.type === 'group')
						overflowGroup = overflowItem
						result = visitItems(mainItem.items, overflowGroup.items)
					} else {
						result = visitItems(mainItem.items, null)
					}

					didShowAnyInMain ||= result.didShowAnyInMain
					didShowAnyInOverflow ||= result.didShowAnyInOverflow

					setAttribute(
						mainItem.element,
						'data-toolbar-visible',
						result.didShowAnyInMain ? 'true' : 'false'
					)
					if (overflowGroup) {
						setAttribute(
							overflowGroup.element,
							'data-toolbar-visible',
							result.didShowAnyInOverflow ? 'true' : 'false'
						)
					}
				}
			}
			return { didShowAnyInMain, didShowAnyInOverflow }
		}

		const { didShowAnyInOverflow } = visitItems(mainItems, overflowItems)
		setShouldShowOverflow(didShowAnyInOverflow)
		if (newActiveOverflowItem) {
			setLastActiveOverflowItem(newActiveOverflowItem)
		} else if (shouldInvalidateLastActiveOverflowItem) {
			setLastActiveOverflowItem(null)
		}

		rButtons.current = numberedButtons
	})

	useLayoutEffect(() => {
		onDomUpdate()
	})

	useLayoutEffect(() => {
		if (!mainToolsRef.current) return

		const mutationObserver = new MutationObserver(onDomUpdate)
		mutationObserver.observe(mainToolsRef.current, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true,
		})

		const sizingParent = findParentWithClassName(mainToolsRef.current, sizingParentClassName)
		const resizeObserver = new ResizeObserver(onDomUpdate)
		resizeObserver.observe(sizingParent)

		return () => {
			mutationObserver.disconnect()
			resizeObserver.disconnect()
		}
	}, [onDomUpdate, sizingParentClassName])

	useEffect(() => {
		if (!editor.options.enableToolbarKeyboardShortcuts) return

		function handleKeyDown(event: KeyboardEvent) {
			if (
				areShortcutsDisabled(editor) ||
				activeElementShouldCaptureKeys(true /* allow buttons */)
			) {
				return
			}

			// no accelerator keys
			if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
			const index = NUMBERED_SHORTCUT_KEYS[event.key]
			if (typeof index === 'number') {
				preventDefault(event)
				rButtons.current[index]?.click()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [editor])

	const popoverId = 'toolbar overflow'

	const Layout = orientation === 'horizontal' ? TldrawUiRow : TldrawUiColumn
	return (
		<>
			<TldrawUiToolbar
				orientation={orientation}
				className={classNames('tlui-main-toolbar__tools', {
					'tlui-main-toolbar__tools__mobile': breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM,
				})}
				label={msg('tool-panel.title')}
			>
				<Layout id={`${id}_main`} ref={mainToolsRef}>
					<TldrawUiMenuContextProvider type="toolbar" sourceId="toolbar">
						{children}
					</TldrawUiMenuContextProvider>
				</Layout>
				{shouldShowOverflow && (
					<IsInOverflowContext.Provider value={true}>
						<TldrawUiPopover id={popoverId} open={isOpen} onOpenChange={setIsOpen}>
							<TldrawUiPopoverTrigger>
								<TldrawUiToolbarButton
									title={msg('tool-panel.more')}
									type="tool"
									className="tlui-main-toolbar__overflow"
									data-testid="tools.more-button"
								>
									<TldrawUiButtonIcon
										icon={orientation === 'horizontal' ? 'chevron-up' : 'chevron-right'}
									/>
								</TldrawUiToolbarButton>
							</TldrawUiPopoverTrigger>
							<TldrawUiPopoverContent
								side={orientation === 'horizontal' ? 'top' : 'right'}
								align={orientation === 'horizontal' ? 'center' : 'end'}
							>
								<TldrawUiToolbar
									orientation="grid"
									className="tlui-main-toolbar__overflow-content"
									ref={setOverflowTools}
									data-testid="tools.more-content"
									label={msg('tool-panel.more')}
									id={`${id}_more`}
									onClick={() => {
										tlmenus.deleteOpenMenu(popoverId, editor.contextId)
										setIsOpen(false)
									}}
								>
									<TldrawUiMenuContextProvider type="toolbar-overflow" sourceId="toolbar">
										{children}
									</TldrawUiMenuContextProvider>
								</TldrawUiToolbar>
							</TldrawUiPopoverContent>
						</TldrawUiPopover>
					</IsInOverflowContext.Provider>
				)}
			</TldrawUiToolbar>
		</>
	)
}

export const isActiveTLUiToolItem = (
	item: TLUiToolItem,
	activeToolId: string | undefined,
	geoState: string | null | undefined
) => {
	return item.meta?.geo
		? activeToolId === 'geo' && geoState === item.meta?.geo
		: activeToolId === item.id
}

function findParentWithClassName(startingElement: HTMLElement, className: string): HTMLElement {
	let element: HTMLElement | null = startingElement
	while (element) {
		if (element.classList.contains(className)) {
			return element
		}
		element = element.parentElement
	}
	throw new Error('Could not find parent with class name ' + className)
}

function setAttribute(element: HTMLElement, name: string, value: string) {
	if (element.getAttribute(name) === value) return
	element.setAttribute(name, value)
}
