import classNames from 'classnames'
import { ContextMenu as _ContextMenu, DropdownMenu as _DropdownMenu } from 'radix-ui'
import { createContext, ReactNode, useContext } from 'react'
import { useTldrawUiMenuIsOpen } from '../context/menu-state'
import { useTldrawUiPlatform } from '../context/platform'
import { TldrawUiPortalScope, useTldrawUiPortalContainer } from '../context/portal'
import { useTldrawUiTranslation } from '../context/translation'
import { kbdStr } from '../kbd'
import { preventDefault } from '../utils'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiButtonSpinner,
} from './TldrawUiButton'
import {
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuSub,
	TldrawUiDropdownMenuSubContent,
	TldrawUiDropdownMenuSubTrigger,
} from './TldrawUiDropdownMenu'
import { TldrawUiIcon, TldrawUiIconJsx } from './TldrawUiIcon'
import { TldrawUiKbd } from './TldrawUiKbd'

/** @public */
export type TldrawUiMenuContextType = 'menu' | 'context-menu' | 'panel' | 'small-icons'

const menuContext = createContext<{
	type: TldrawUiMenuContextType
	sourceId: string
} | null>(null)

/** @public */
export function useTldrawUiMenuContext() {
	const context = useContext(menuContext)
	if (!context) {
		throw new Error('useTldrawUiMenuContext must be used within a TldrawUiMenuContextProvider')
	}
	return context
}

/** @public */
export interface TldrawUiMenuContextProviderProps {
	type: TldrawUiMenuContextType
	sourceId: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiMenuContextProvider({
	type,
	sourceId,
	children,
}: TldrawUiMenuContextProviderProps) {
	return <menuContext.Provider value={{ type, sourceId }}>{children}</menuContext.Provider>
}

/** @public */
export interface TldrawUiMenuGroupProps {
	id: string
	label?: string
	className?: string
	children?: ReactNode
}

/** @public @react */
export function TldrawUiMenuGroup({ id, className, children }: TldrawUiMenuGroupProps) {
	const menu = useTldrawUiMenuContext()
	const { dir } = useTldrawUiTranslation()

	switch (menu.type) {
		case 'menu': {
			return (
				<TldrawUiDropdownMenuGroup
					className={className}
					data-testid={`${menu.sourceId}-group.${id}`}
				>
					{children}
				</TldrawUiDropdownMenuGroup>
			)
		}
		case 'context-menu':
		case 'panel': {
			return (
				<div
					dir={dir}
					className={classNames('tl-menu__group', className)}
					data-testid={`${menu.sourceId}-group.${id}`}
				>
					{children}
				</div>
			)
		}
		case 'small-icons': {
			return children
		}
		default: {
			return children
		}
	}
}

/** @public */
export interface TldrawUiMenuItemProps {
	id: string
	kbd?: string
	label?: string
	icon?: string | TldrawUiIconJsx
	iconLeft?: string | TldrawUiIconJsx
	disabled?: boolean
	busy?: boolean
	isSelected?: boolean
	readonlyOk?: boolean
	onSelect(): Promise<void> | void
	spinner?: boolean
}

/** @public @react */
export function TldrawUiMenuItem({
	disabled = false,
	spinner = false,
	busy = false,
	id,
	kbd,
	label,
	icon,
	iconLeft,
	onSelect,
	isSelected,
}: TldrawUiMenuItemProps) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const { dir } = useTldrawUiTranslation()
	const { isDarwin } = useTldrawUiPlatform()

	const kbdToUse = kbd ? kbdStr(kbd, isDarwin) : undefined
	const titleStr = label && kbdToUse ? `${label} ${kbdToUse}` : label
	const showSpinner = busy || spinner

	switch (menuType) {
		case 'menu': {
			return (
				<TldrawUiDropdownMenuItem>
					<TldrawUiButton
						type="menu"
						data-testid={`${sourceId}.${id}`}
						disabled={disabled}
						onClick={() => onSelect()}
					>
						{iconLeft && <TldrawUiButtonIcon icon={iconLeft} small />}
						<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
						{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
						{showSpinner && <TldrawUiButtonSpinner />}
					</TldrawUiButton>
				</TldrawUiDropdownMenuItem>
			)
		}
		case 'context-menu': {
			if (disabled) return null

			return (
				<_ContextMenu.Item
					dir={dir}
					draggable={false}
					className="tl-button tl-button--menu"
					data-testid={`${sourceId}.${id}`}
					onPointerUp={(e) => {
						if (e.button !== 0) {
							preventDefault(e)
						}
					}}
					onSelect={() => onSelect()}
				>
					<span className="tl-button__label" draggable={false}>
						{label}
					</span>
					{iconLeft && <TldrawUiButtonIcon icon={iconLeft} small />}
					{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
					{showSpinner && <TldrawUiButtonSpinner />}
				</_ContextMenu.Item>
			)
		}
		case 'panel': {
			return (
				<TldrawUiButton
					type="menu"
					data-testid={`${sourceId}.${id}`}
					disabled={disabled}
					isActive={isSelected}
					onClick={() => onSelect()}
				>
					{iconLeft && <TldrawUiButtonIcon icon={iconLeft} small />}
					<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
					{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
					{showSpinner && <TldrawUiButtonSpinner />}
				</TldrawUiButton>
			)
		}
		case 'small-icons': {
			return (
				<TldrawUiButton
					type="icon"
					data-testid={`${sourceId}.${id}`}
					disabled={disabled}
					isActive={isSelected}
					title={titleStr}
					onClick={() => onSelect()}
				>
					<TldrawUiButtonIcon icon={icon!} small />
				</TldrawUiButton>
			)
		}
		default: {
			return null
		}
	}
}

/** @public */
export interface TldrawUiMenuCheckboxItemProps {
	id: string
	kbd?: string
	label?: string
	disabled?: boolean
	checked?: boolean
	onSelect(): Promise<void> | void
}

/** @public @react */
export function TldrawUiMenuCheckboxItem({
	id,
	kbd,
	label,
	disabled = false,
	checked = false,
	onSelect,
}: TldrawUiMenuCheckboxItemProps) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const { dir, msg } = useTldrawUiTranslation()

	switch (menuType) {
		case 'menu': {
			return (
				<_DropdownMenu.CheckboxItem
					dir={dir}
					className="tl-button tl-button--menu tl-button--checkbox"
					data-testid={`${sourceId}.${id}`}
					onSelect={(e) => {
						onSelect()
						preventDefault(e)
					}}
					disabled={disabled}
					checked={checked}
				>
					<TldrawUiIcon
						small
						label={msg(checked ? 'ui.checked' : 'ui.unchecked', checked ? 'Checked' : 'Unchecked')}
						icon={checked ? 'check' : 'none'}
					/>
					{label && (
						<span className="tl-button__label" draggable={false}>
							{label}
						</span>
					)}
					{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
				</_DropdownMenu.CheckboxItem>
			)
		}
		case 'context-menu': {
			return (
				<_ContextMenu.CheckboxItem
					key={id}
					className="tl-button tl-button--menu tl-button--checkbox"
					dir={dir}
					data-testid={`${sourceId}.${id}`}
					onSelect={(e) => {
						onSelect()
						preventDefault(e)
					}}
					disabled={disabled}
					checked={checked}
				>
					<TldrawUiIcon
						small
						label={msg(checked ? 'ui.checked' : 'ui.unchecked', checked ? 'Checked' : 'Unchecked')}
						icon={checked ? 'check' : 'none'}
					/>
					{label && (
						<span className="tl-button__label" draggable={false}>
							{label}
						</span>
					)}
					{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
				</_ContextMenu.CheckboxItem>
			)
		}
		default: {
			return null
		}
	}
}

/** @public */
export interface TldrawUiMenuSubmenuProps {
	id: string
	label?: string
	disabled?: boolean
	children: ReactNode
	size?: 'tiny' | 'small' | 'medium' | 'wide'
}

/** @public @react */
export function TldrawUiMenuSubmenu({
	id,
	disabled = false,
	label,
	size = 'small',
	children,
}: TldrawUiMenuSubmenuProps) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const container = useTldrawUiPortalContainer()
	const { dir } = useTldrawUiTranslation()

	switch (menuType) {
		case 'menu': {
			return (
				<TldrawUiDropdownMenuSub id={`${sourceId}-sub.${id}`}>
					<TldrawUiDropdownMenuSubTrigger
						id={`${sourceId}-sub.${id}-button`}
						disabled={disabled}
						label={label ?? ''}
					/>
					<TldrawUiDropdownMenuSubContent id={`${sourceId}-sub.${id}-content`} size={size}>
						{children}
					</TldrawUiDropdownMenuSubContent>
				</TldrawUiDropdownMenuSub>
			)
		}
		case 'context-menu': {
			if (disabled) return null

			return (
				<TldrawUiContextMenuSubWithMenu id={`${sourceId}-sub.${id}`}>
					<_ContextMenu.SubTrigger dir={dir} disabled={disabled} asChild>
						<TldrawUiButton
							data-testid={`${sourceId}-sub.${id}-button`}
							type="menu"
							className="tl-menu__submenu-trigger"
						>
							<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
							<TldrawUiButtonIcon icon={dir === 'rtl' ? 'chevron-left' : 'chevron-right'} small />
						</TldrawUiButton>
					</_ContextMenu.SubTrigger>
					<_ContextMenu.Portal container={container}>
						<TldrawUiPortalScope>
							<_ContextMenu.SubContent
								data-testid={`${sourceId}-sub.${id}-content`}
								className="tl-menu"
								alignOffset={-1}
								sideOffset={-4}
								collisionPadding={4}
								data-size={size}
							>
								{children}
							</_ContextMenu.SubContent>
						</TldrawUiPortalScope>
					</_ContextMenu.Portal>
				</TldrawUiContextMenuSubWithMenu>
			)
		}
		default: {
			return children
		}
	}
}

function TldrawUiContextMenuSubWithMenu({ id, children }: { id: string; children: ReactNode }) {
	const [open, onOpenChange] = useTldrawUiMenuIsOpen(id)

	return (
		<_ContextMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_ContextMenu.Sub>
	)
}
