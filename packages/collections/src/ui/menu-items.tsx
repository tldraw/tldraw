import { ContextMenu as _ContextMenu } from 'radix-ui'
import { createContext, type PointerEvent, type ReactNode, type RefObject, useContext } from 'react'
import {
	preventDefault,
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuSub,
	TldrawUiDropdownMenuSubContent,
	TldrawUiDropdownMenuSubTrigger,
} from 'tldraw'

const InContextMenuContext = createContext(false)

/**
 * Renders the {@link MenuItem}s inside it as context menu items, for placing them in a submenu of
 * tldraw's context menu, whose items come from a different menu than a dropdown's.
 */
export function InContextMenu({ children }: { children: ReactNode }) {
	return <InContextMenuContext.Provider value>{children}</InContextMenuContext.Provider>
}

function MenuItemRoot({ noClose, children }: { noClose?: boolean; children: ReactNode }) {
	const inContextMenu = useContext(InContextMenuContext)
	if (!inContextMenu) {
		return <TldrawUiDropdownMenuItem noClose={noClose}>{children}</TldrawUiDropdownMenuItem>
	}
	return (
		<_ContextMenu.Item
			asChild
			onSelect={noClose ? preventDefault : undefined}
			// Releasing a right-click over an item would otherwise select it.
			onPointerUp={(e) => {
				if (e.button !== 0) preventDefault(e)
			}}
		>
			{children}
		</_ContextMenu.Item>
	)
}

function keepFocusWhile(holdFocus: boolean) {
	return (e: PointerEvent) => {
		if (holdFocus) e.preventDefault()
	}
}

export function MenuItem({
	buttonRef,
	label,
	danger,
	noClose,
	holdFocus = false,
	onClick,
}: {
	buttonRef?: RefObject<HTMLButtonElement | null>
	label: string
	danger?: boolean
	noClose?: boolean
	/** Stops the menu moving focus to the item on hover, which would blur and commit a rename. */
	holdFocus?: boolean
	onClick(): void
}) {
	const keepFocus = keepFocusWhile(holdFocus)
	return (
		<MenuItemRoot noClose={noClose}>
			<button
				ref={buttonRef}
				type="button"
				className={
					danger
						? 'tlui-collections-menu__item tlui-collections-menu__item--danger'
						: 'tlui-collections-menu__item'
				}
				onClick={onClick}
				onPointerMove={keepFocus}
				onPointerLeave={keepFocus}
			>
				<span>{label}</span>
			</button>
		</MenuItemRoot>
	)
}

/** Stays open when picked, so several options can be set in one visit. */
export function MenuCheckboxItem({
	label,
	checked,
	onSelect,
}: {
	label: string
	checked: boolean
	onSelect(): void
}) {
	return (
		<TldrawUiDropdownMenuCheckboxItem title={label} checked={checked} onSelect={onSelect}>
			<span className="tlui-button__label">{label}</span>
		</TldrawUiDropdownMenuCheckboxItem>
	)
}

export function MenuSubmenu({
	id,
	label,
	holdFocus = false,
	children,
}: {
	id: string
	label: string
	/** As for {@link MenuItem}. */
	holdFocus?: boolean
	children: ReactNode
}) {
	// The submenu trigger takes no event handlers, so its wrapper does what MenuItem's holdFocus does.
	const keepFocus = keepFocusWhile(holdFocus)
	return (
		<TldrawUiDropdownMenuSub id={id}>
			<div
				className="tlui-collections-menu__submenu-trigger"
				onPointerMoveCapture={keepFocus}
				onPointerOutCapture={keepFocus}
			>
				<TldrawUiDropdownMenuSubTrigger label={label} />
			</div>
			<TldrawUiDropdownMenuSubContent alignOffset={-4} sideOffset={0}>
				<TldrawUiDropdownMenuGroup className="tlui-collections-menu__submenu">
					{children}
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuSubContent>
		</TldrawUiDropdownMenuSub>
	)
}
