import classNames from 'classnames'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { ReactNode } from 'react'
import { useTlMenuIsOpen } from '../context/menu-state'
import { useTlPortalContainer } from '../context/portal'
import { useTlTranslation } from '../context/translation'
import { preventDefault } from '../utils'
import { TlButton, TlButtonIcon, TlButtonLabel } from './TlButton'
import { TlIcon } from './TlIcon'

/** @public */
export interface TlDropdownMenuRootProps {
	id: string
	children: ReactNode
	modal?: boolean
	debugOpen?: boolean
}

/** @public @react */
export function TlDropdownMenuRoot({
	id,
	children,
	modal = false,
	debugOpen = false,
}: TlDropdownMenuRootProps) {
	const [open, onOpenChange] = useTlMenuIsOpen(id)
	const { dir } = useTlTranslation()

	return (
		<_DropdownMenu.Root
			open={debugOpen || open}
			dir={dir}
			modal={modal}
			onOpenChange={onOpenChange}
		>
			{children}
		</_DropdownMenu.Root>
	)
}

/** @public */
export interface TlDropdownMenuTriggerProps {
	children?: ReactNode
}

/** @public @react */
export function TlDropdownMenuTrigger({ children, ...rest }: TlDropdownMenuTriggerProps) {
	const { dir } = useTlTranslation()

	return (
		<_DropdownMenu.Trigger dir={dir} asChild onTouchEnd={(e) => preventDefault(e)} {...rest}>
			{children}
		</_DropdownMenu.Trigger>
	)
}

/** @public */
export interface TlDropdownMenuContentProps {
	id?: string
	className?: string
	side?: 'bottom' | 'top' | 'right' | 'left'
	align?: 'start' | 'center' | 'end'
	sideOffset?: number
	alignOffset?: number
	collisionPadding?: number
	children: ReactNode
}

/** @public @react */
export function TlDropdownMenuContent({
	className,
	side = 'bottom',
	align = 'start',
	sideOffset = 8,
	alignOffset = 8,
	collisionPadding = 4,
	children,
}: TlDropdownMenuContentProps) {
	const container = useTlPortalContainer()

	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.Content
				className={classNames('tl-menu', className)}
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				collisionPadding={collisionPadding}
			>
				{children}
			</_DropdownMenu.Content>
		</_DropdownMenu.Portal>
	)
}

/** @public */
export interface TlDropdownMenuSubProps {
	id: string
	children: ReactNode
}

/** @public @react */
export function TlDropdownMenuSub({ id, children }: TlDropdownMenuSubProps) {
	const [open, onOpenChange] = useTlMenuIsOpen(id)

	return (
		<_DropdownMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_DropdownMenu.Sub>
	)
}

/** @public */
export interface TlDropdownMenuSubTriggerProps {
	label: string
	id?: string
	title?: string
	disabled?: boolean
}

/** @public @react */
export function TlDropdownMenuSubTrigger({
	id,
	label,
	title,
	disabled,
}: TlDropdownMenuSubTriggerProps) {
	const { dir } = useTlTranslation()

	return (
		<_DropdownMenu.SubTrigger dir={dir} asChild disabled={disabled}>
			<TlButton
				data-testid={id}
				type="menu"
				className="tl-menu__submenu-trigger"
				disabled={disabled}
				title={title}
			>
				<TlButtonLabel>{label}</TlButtonLabel>
				<TlButtonIcon icon={dir === 'rtl' ? 'chevron-left' : 'chevron-right'} small />
			</TlButton>
		</_DropdownMenu.SubTrigger>
	)
}

/** @public */
export interface TlDropdownMenuSubContentProps {
	id?: string
	alignOffset?: number
	sideOffset?: number
	size?: 'tiny' | 'small' | 'medium' | 'wide'
	children: ReactNode
}

/** @public @react */
export function TlDropdownMenuSubContent({
	id,
	alignOffset = -1,
	sideOffset = -6,
	size = 'small',
	children,
}: TlDropdownMenuSubContentProps) {
	const container = useTlPortalContainer()

	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.SubContent
				data-testid={id}
				className="tl-menu"
				alignOffset={alignOffset}
				sideOffset={sideOffset}
				collisionPadding={4}
				data-size={size}
			>
				{children}
			</_DropdownMenu.SubContent>
		</_DropdownMenu.Portal>
	)
}

/** @public */
export interface TlDropdownMenuGroupProps {
	children: ReactNode
	className?: string
	'data-testid'?: string
}

/** @public @react */
export function TlDropdownMenuGroup({
	className,
	children,
	'data-testid': dataTestId,
}: TlDropdownMenuGroupProps) {
	const { dir } = useTlTranslation()

	return (
		<div dir={dir} className={classNames('tl-menu__group', className)} data-testid={dataTestId}>
			{children}
		</div>
	)
}

/** @public @react */
export function TlDropdownMenuIndicator() {
	const { dir, msg } = useTlTranslation()

	return (
		<_DropdownMenu.ItemIndicator dir={dir} asChild>
			<TlIcon label={msg('ui.checked', 'Checked')} icon="check" />
		</_DropdownMenu.ItemIndicator>
	)
}

/** @public */
export interface TlDropdownMenuItemProps {
	noClose?: boolean
	children: ReactNode
}

/** @public @react */
export function TlDropdownMenuItem({ noClose, children }: TlDropdownMenuItemProps) {
	const { dir } = useTlTranslation()

	return (
		<_DropdownMenu.Item dir={dir} asChild onClick={noClose ? preventDefault : undefined}>
			{children}
		</_DropdownMenu.Item>
	)
}

/** @public */
export interface TlDropdownMenuCheckboxItemProps {
	checked?: boolean
	onSelect?(e: Event): void
	disabled?: boolean
	title: string
	children: ReactNode
}

/** @public @react */
export function TlDropdownMenuCheckboxItem({
	children,
	onSelect,
	...rest
}: TlDropdownMenuCheckboxItemProps) {
	const { dir, msg } = useTlTranslation()

	return (
		<_DropdownMenu.CheckboxItem
			dir={dir}
			className="tl-button tl-button--menu tl-button--checkbox"
			onSelect={(e) => {
				onSelect?.(e)
				preventDefault(e)
			}}
			{...rest}
		>
			<div className="tl-menu__checkbox-indicator">
				<_DropdownMenu.ItemIndicator dir={dir}>
					<TlIcon label={msg('ui.checked', 'Checked')} icon="check" small />
				</_DropdownMenu.ItemIndicator>
			</div>
			{children}
		</_DropdownMenu.CheckboxItem>
	)
}
