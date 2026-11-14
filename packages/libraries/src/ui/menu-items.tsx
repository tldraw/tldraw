import { ContextMenu as _ContextMenu } from 'radix-ui'
import { createContext, type PointerEvent, type ReactNode, type RefObject, useContext } from 'react'
import {
	defineMessages,
	preventDefault,
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuSub,
	TldrawUiDropdownMenuSubContent,
	TldrawUiDropdownMenuSubTrigger,
	TldrawUiIcon,
	useTranslation,
} from 'tldraw'
import type { TLLibraryOwner } from '../lib/LibrarySource'

const messages = defineMessages({
	other: { id: 'libraries.tabs.other', defaultMessage: 'Other' },
})

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

/** @public */
export interface MenuItemProps {
	buttonRef?: RefObject<HTMLButtonElement | null>
	label: string
	danger?: boolean
	noClose?: boolean
	/** Stops the menu moving focus to the item on hover, which would blur and commit a rename. */
	holdFocus?: boolean
	onClick(): void
}

/**
 * An item in the panel's menus, exported as `LibraryMenuItem` for a host's own items in
 * {@link LibrariesPanelProps.menuItems}.
 * @public @react
 */
export function MenuItem({
	buttonRef,
	label,
	danger,
	noClose,
	holdFocus = false,
	onClick,
}: MenuItemProps) {
	const keepFocus = keepFocusWhile(holdFocus)
	return (
		<MenuItemRoot noClose={noClose}>
			<button
				ref={buttonRef}
				type="button"
				className={
					danger
						? 'tlui-libraries-menu__item tlui-libraries-menu__item--danger'
						: 'tlui-libraries-menu__item'
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
				className="tlui-libraries-menu__submenu-trigger"
				onPointerMoveCapture={keepFocus}
				onPointerOutCapture={keepFocus}
			>
				<TldrawUiDropdownMenuSubTrigger label={label} />
			</div>
			<TldrawUiDropdownMenuSubContent alignOffset={-4} sideOffset={0}>
				<TldrawUiDropdownMenuGroup className="tlui-libraries-menu__submenu">
					{children}
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuSubContent>
		</TldrawUiDropdownMenuSub>
	)
}

/** @public */
export interface LibraryMenuTarget {
	id: string
	name: string
	/**
	 * Who the library belongs to. Targets spanning two or more owners are listed under their
	 * owners' names.
	 */
	owner?: TLLibraryOwner
}

/**
 * Menu items for libraries to send something to, in the order given. Targets spanning two or more
 * owners are listed under each owner's name, and icon if it has one.
 */
export function MenuTargetItems({
	targets,
	onSelect,
}: {
	targets: LibraryMenuTarget[]
	onSelect(libraryId: string): void
}) {
	const msg = useTranslation()
	const groups: { owner?: TLLibraryOwner; targets: LibraryMenuTarget[] }[] = []
	for (const target of targets) {
		const last = groups[groups.length - 1]
		if (last && last.owner?.id === target.owner?.id) last.targets.push(target)
		else groups.push({ owner: target.owner, targets: [target] })
	}
	const items = (list: LibraryMenuTarget[]) =>
		list.map((target) => (
			<MenuItem key={target.id} label={target.name} onClick={() => onSelect(target.id)} />
		))
	if (groups.length < 2) return items(targets)
	return groups.map(({ owner, targets: list }) => {
		const label = owner ? owner.name : msg(messages.other)
		return (
			<div key={owner?.id ?? ''} role="group" aria-label={label}>
				<div className="tlui-libraries-menu-heading" role="presentation">
					{owner?.icon && <TldrawUiIcon icon={owner.icon} label="" small />}
					<span>{label}</span>
				</div>
				{items(list)}
			</div>
		)
	})
}
