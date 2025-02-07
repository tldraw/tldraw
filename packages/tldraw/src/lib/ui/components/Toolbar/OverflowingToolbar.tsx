import {
	activeElementShouldCaptureKeys,
	preventDefault,
	useEditor,
	useEvent,
	useUniqueSafeId,
} from '@tldraw/editor'
import classNames from 'classnames'
import { createContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { areShortcutsDisabled } from '../../hooks/useKeyboardShortcuts'
import { TLUiToolItem } from '../../hooks/useTools'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
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
}

/** @public @react */
export function OverflowingToolbar({ children }: OverflowingToolbarProps) {
	const editor = useEditor()
	const id = useUniqueSafeId()
	const breakpoint = useBreakpoint()
	const msg = useTranslation()
	const rButtons = useRef<HTMLElement[]>([])

	const overflowIndex = Math.min(8, 5 + breakpoint)

	const [totalItems, setTotalItems] = useState(0)
	const mainToolsRef = useRef<HTMLDivElement>(null)
	const [lastActiveOverflowItem, setLastActiveOverflowItem] = useState<string | null>(null)

	const css = useMemo(() => {
		const activeCss = lastActiveOverflowItem ? `:not([data-value="${lastActiveOverflowItem}"])` : ''

		return `
			#${id}_main > *:nth-child(n + ${overflowIndex + (lastActiveOverflowItem ? 1 : 2)})${activeCss} {
				display: none;
			}
			#${id}_more > *:nth-child(-n + ${overflowIndex}) {
				display: none;
			}
        `
	}, [lastActiveOverflowItem, id, overflowIndex])

	const onDomUpdate = useEvent(() => {
		if (!mainToolsRef.current) return

		const children = Array.from(mainToolsRef.current.children)
		setTotalItems(children.length)

		// If the last active overflow item is no longer in the overflow, clear it
		const lastActiveElementIdx = children.findIndex(
			(el) => el.getAttribute('data-value') === lastActiveOverflowItem
		)
		if (lastActiveElementIdx <= overflowIndex) {
			setLastActiveOverflowItem(null)
		}

		// But if there's a new active item...
		const activeElementIdx = Array.from(mainToolsRef.current.children).findIndex(
			(el) => el.getAttribute('aria-checked') === 'true'
		)
		if (activeElementIdx === -1) return

		// ...and it's in the overflow, set it as the last active overflow item
		if (activeElementIdx >= overflowIndex) {
			setLastActiveOverflowItem(children[activeElementIdx].getAttribute('data-value'))
		}

		// Save the buttons that are actually visible
		rButtons.current = Array.from(mainToolsRef.current?.children ?? []).filter(
			(el): el is HTMLElement => {
				// only count html elements...
				if (!(el instanceof HTMLElement)) return false

				// ...that are buttons...
				if (el.tagName.toLowerCase() !== 'button') return false

				// ...that are actually visible
				return !!(el.offsetWidth || el.offsetHeight)
			}
		)
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
			attributeFilter: ['data-value', 'aria-checked'],
		})

		return () => {
			mutationObserver.disconnect()
		}
	}, [onDomUpdate])

	useEffect(() => {
		if (!editor.options.enableToolbarKeyboardShortcuts) return

		function handleKeyDown(event: KeyboardEvent) {
			if (areShortcutsDisabled(editor) || activeElementShouldCaptureKeys()) return
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

	return (
		<>
			<style>{css}</style>
			<div
				className={classNames('tlui-toolbar__tools', {
					'tlui-toolbar__tools__mobile': breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM,
				})}
				role="radiogroup"
			>
				<div id={`${id}_main`} ref={mainToolsRef} className="tlui-toolbar__tools__list">
					<TldrawUiMenuContextProvider type="toolbar" sourceId="toolbar">
						{children}
					</TldrawUiMenuContextProvider>
				</div>
				{/* There is a +1 because if the menu is just one item, it's not necessary. */}
				{totalItems > overflowIndex + 1 && (
					<IsInOverflowContext.Provider value={true}>
						<TldrawUiDropdownMenuRoot id="toolbar overflow" modal={false}>
							<TldrawUiDropdownMenuTrigger>
								<TldrawUiButton
									title={msg('tool-panel.more')}
									type="tool"
									className="tlui-toolbar__overflow"
									data-testid="tools.more-button"
								>
									<TldrawUiButtonIcon icon="chevron-up" />
								</TldrawUiButton>
							</TldrawUiDropdownMenuTrigger>
							<TldrawUiDropdownMenuContent side="top" align="center">
								<div
									className="tlui-buttons__grid"
									data-testid="tools.more-content"
									id={`${id}_more`}
								>
									<TldrawUiMenuContextProvider type="toolbar-overflow" sourceId="toolbar">
										{children}
									</TldrawUiMenuContextProvider>
								</div>
							</TldrawUiDropdownMenuContent>
						</TldrawUiDropdownMenuRoot>
					</IsInOverflowContext.Provider>
				)}
			</div>
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
