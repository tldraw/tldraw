import classNames from 'classnames'
import { ContextMenu as _ContextMenu, DropdownMenu as _DropdownMenu } from 'radix-ui'
import { createContext, ReactNode, useContext } from 'react'
import { useTlMenuIsOpen } from '../context/menu-state'
import { useTlPlatform } from '../context/platform'
import { useTlPortalContainer } from '../context/portal'
import { useTlTranslation } from '../context/translation'
import { kbdStr } from '../kbd'
import { preventDefault } from '../utils'
import { TlButton, TlButtonIcon, TlButtonLabel, TlButtonSpinner } from './TlButton'
import {
	TlDropdownMenuGroup,
	TlDropdownMenuItem,
	TlDropdownMenuSub,
	TlDropdownMenuSubContent,
	TlDropdownMenuSubTrigger,
} from './TlDropdownMenu'
import { TlIcon, TlIconJsx } from './TlIcon'
import { TlKbd } from './TlKbd'

/** @public */
export type TlMenuContextType = 'menu' | 'context-menu' | 'panel' | 'small-icons'

const menuContext = createContext<{
	type: TlMenuContextType
	sourceId: string
} | null>(null)

/** @public */
export function useTlMenuContext() {
	const context = useContext(menuContext)
	if (!context) {
		throw new Error('useTlMenuContext must be used within a TlMenuContextProvider')
	}
	return context
}

/** @public */
export interface TlMenuContextProviderProps {
	type: TlMenuContextType
	sourceId: string
	children: ReactNode
}

/** @public @react */
export function TlMenuContextProvider({ type, sourceId, children }: TlMenuContextProviderProps) {
	return <menuContext.Provider value={{ type, sourceId }}>{children}</menuContext.Provider>
}

/** @public */
export interface TlMenuGroupProps {
	id: string
	label?: string
	className?: string
	children?: ReactNode
}

/** @public @react */
export function TlMenuGroup({ id, className, children }: TlMenuGroupProps) {
	const menu = useTlMenuContext()
	const { dir } = useTlTranslation()

	switch (menu.type) {
		case 'menu': {
			return (
				<TlDropdownMenuGroup className={className} data-testid={`${menu.sourceId}-group.${id}`}>
					{children}
				</TlDropdownMenuGroup>
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
export interface TlMenuItemProps {
	id: string
	kbd?: string
	label?: string
	icon?: string | TlIconJsx
	iconLeft?: string | TlIconJsx
	disabled?: boolean
	busy?: boolean
	isSelected?: boolean
	readonlyOk?: boolean
	onSelect(): Promise<void> | void
	spinner?: boolean
}

/** @public @react */
export function TlMenuItem({
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
}: TlMenuItemProps) {
	const { type: menuType, sourceId } = useTlMenuContext()
	const { dir } = useTlTranslation()
	const { isDarwin } = useTlPlatform()

	const kbdToUse = kbd ? kbdStr(kbd, isDarwin) : undefined
	const titleStr = label && kbdToUse ? `${label} ${kbdToUse}` : label
	const showSpinner = busy || spinner

	switch (menuType) {
		case 'menu': {
			return (
				<TlDropdownMenuItem>
					<TlButton
						type="menu"
						data-testid={`${sourceId}.${id}`}
						disabled={disabled}
						onClick={() => onSelect()}
					>
						{iconLeft && <TlButtonIcon icon={iconLeft} small />}
						<TlButtonLabel>{label}</TlButtonLabel>
						{kbd && <TlKbd>{kbd}</TlKbd>}
						{showSpinner && <TlButtonSpinner />}
					</TlButton>
				</TlDropdownMenuItem>
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
					{iconLeft && <TlButtonIcon icon={iconLeft} small />}
					{kbd && <TlKbd>{kbd}</TlKbd>}
					{showSpinner && <TlButtonSpinner />}
				</_ContextMenu.Item>
			)
		}
		case 'panel': {
			return (
				<TlButton
					type="menu"
					data-testid={`${sourceId}.${id}`}
					disabled={disabled}
					isActive={isSelected}
					onClick={() => onSelect()}
				>
					{iconLeft && <TlButtonIcon icon={iconLeft} small />}
					<TlButtonLabel>{label}</TlButtonLabel>
					{kbd && <TlKbd>{kbd}</TlKbd>}
					{showSpinner && <TlButtonSpinner />}
				</TlButton>
			)
		}
		case 'small-icons': {
			return (
				<TlButton
					type="icon"
					data-testid={`${sourceId}.${id}`}
					disabled={disabled}
					isActive={isSelected}
					title={titleStr}
					onClick={() => onSelect()}
				>
					<TlButtonIcon icon={icon!} small />
				</TlButton>
			)
		}
		default: {
			return null
		}
	}
}

/** @public */
export interface TlMenuCheckboxItemProps {
	id: string
	kbd?: string
	label?: string
	disabled?: boolean
	checked?: boolean
	onSelect(): Promise<void> | void
}

/** @public @react */
export function TlMenuCheckboxItem({
	id,
	kbd,
	label,
	disabled = false,
	checked = false,
	onSelect,
}: TlMenuCheckboxItemProps) {
	const { type: menuType, sourceId } = useTlMenuContext()
	const { dir, msg } = useTlTranslation()

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
					<TlIcon
						small
						label={msg(checked ? 'ui.checked' : 'ui.unchecked', checked ? 'Checked' : 'Unchecked')}
						icon={checked ? 'check' : 'none'}
					/>
					{label && (
						<span className="tl-button__label" draggable={false}>
							{label}
						</span>
					)}
					{kbd && <TlKbd>{kbd}</TlKbd>}
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
					<TlIcon
						small
						label={msg(checked ? 'ui.checked' : 'ui.unchecked', checked ? 'Checked' : 'Unchecked')}
						icon={checked ? 'check' : 'none'}
					/>
					{label && (
						<span className="tl-button__label" draggable={false}>
							{label}
						</span>
					)}
					{kbd && <TlKbd>{kbd}</TlKbd>}
				</_ContextMenu.CheckboxItem>
			)
		}
		default: {
			return null
		}
	}
}

/** @public */
export interface TlMenuSubmenuProps {
	id: string
	label?: string
	disabled?: boolean
	children: ReactNode
	size?: 'tiny' | 'small' | 'medium' | 'wide'
}

/** @public @react */
export function TlMenuSubmenu({
	id,
	disabled = false,
	label,
	size = 'small',
	children,
}: TlMenuSubmenuProps) {
	const { type: menuType, sourceId } = useTlMenuContext()
	const container = useTlPortalContainer()
	const { dir } = useTlTranslation()

	switch (menuType) {
		case 'menu': {
			return (
				<TlDropdownMenuSub id={`${sourceId}-sub.${id}`}>
					<TlDropdownMenuSubTrigger
						id={`${sourceId}-sub.${id}-button`}
						disabled={disabled}
						label={label ?? ''}
					/>
					<TlDropdownMenuSubContent id={`${sourceId}-sub.${id}-content`} size={size}>
						{children}
					</TlDropdownMenuSubContent>
				</TlDropdownMenuSub>
			)
		}
		case 'context-menu': {
			if (disabled) return null

			return (
				<TlContextMenuSubWithMenu id={`${sourceId}-sub.${id}`}>
					<_ContextMenu.SubTrigger dir={dir} disabled={disabled} asChild>
						<TlButton
							data-testid={`${sourceId}-sub.${id}-button`}
							type="menu"
							className="tl-menu__submenu-trigger"
						>
							<TlButtonLabel>{label}</TlButtonLabel>
							<TlButtonIcon icon={dir === 'rtl' ? 'chevron-left' : 'chevron-right'} small />
						</TlButton>
					</_ContextMenu.SubTrigger>
					<_ContextMenu.Portal container={container}>
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
					</_ContextMenu.Portal>
				</TlContextMenuSubWithMenu>
			)
		}
		default: {
			return children
		}
	}
}

function TlContextMenuSubWithMenu({ id, children }: { id: string; children: ReactNode }) {
	const [open, onOpenChange] = useTlMenuIsOpen(id)

	return (
		<_ContextMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_ContextMenu.Sub>
	)
}
