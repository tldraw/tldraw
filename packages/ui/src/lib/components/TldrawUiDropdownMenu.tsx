import classNames from 'classnames'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { ReactNode } from 'react'
import { useTldrawUiMenuIsOpen } from '../context/menu-state'
import { TldrawUiPortalScope, useTldrawUiPortalContainer } from '../context/portal'
import { useTldrawUiTranslation } from '../context/translation'
import { preventDefault } from '../utils'
import { TldrawUiButton, TldrawUiButtonIcon, TldrawUiButtonLabel } from './TldrawUiButton'
import { TldrawUiIcon } from './TldrawUiIcon'

/** @public */
export interface TldrawUiDropdownMenuRootProps {
	id: string
	children: ReactNode
	modal?: boolean
	debugOpen?: boolean
}

/** @public @react */
export function TldrawUiDropdownMenuRoot({
	id,
	children,
	modal = false,
	debugOpen = false,
}: TldrawUiDropdownMenuRootProps) {
	const [open, onOpenChange] = useTldrawUiMenuIsOpen(id)
	const { dir } = useTldrawUiTranslation()

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
export interface TldrawUiDropdownMenuTriggerProps {
	children?: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuTrigger({
	children,
	...rest
}: TldrawUiDropdownMenuTriggerProps) {
	const { dir } = useTldrawUiTranslation()

	return (
		<_DropdownMenu.Trigger dir={dir} asChild onTouchEnd={(e) => preventDefault(e)} {...rest}>
			{children}
		</_DropdownMenu.Trigger>
	)
}

/** @public */
export interface TldrawUiDropdownMenuContentProps {
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
export function TldrawUiDropdownMenuContent({
	className,
	side = 'bottom',
	align = 'start',
	sideOffset = 8,
	alignOffset = 8,
	collisionPadding = 4,
	children,
}: TldrawUiDropdownMenuContentProps) {
	const container = useTldrawUiPortalContainer()

	return (
		<_DropdownMenu.Portal container={container}>
			<TldrawUiPortalScope>
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
			</TldrawUiPortalScope>
		</_DropdownMenu.Portal>
	)
}

/** @public */
export interface TldrawUiDropdownMenuSubProps {
	id: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuSub({ id, children }: TldrawUiDropdownMenuSubProps) {
	const [open, onOpenChange] = useTldrawUiMenuIsOpen(id)

	return (
		<_DropdownMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_DropdownMenu.Sub>
	)
}

/** @public */
export interface TldrawUiDropdownMenuSubTriggerProps {
	label: string
	id?: string
	title?: string
	disabled?: boolean
	className?: string
}

/** @public @react */
export function TldrawUiDropdownMenuSubTrigger({
	id,
	label,
	title,
	disabled,
	className,
}: TldrawUiDropdownMenuSubTriggerProps) {
	const { dir } = useTldrawUiTranslation()

	return (
		<_DropdownMenu.SubTrigger dir={dir} asChild disabled={disabled}>
			<TldrawUiButton
				data-testid={id}
				type="menu"
				className={classNames('tl-menu__submenu-trigger', className)}
				disabled={disabled}
				title={title}
			>
				<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
				<TldrawUiButtonIcon icon={dir === 'rtl' ? 'chevron-left' : 'chevron-right'} small />
			</TldrawUiButton>
		</_DropdownMenu.SubTrigger>
	)
}

/** @public */
export interface TldrawUiDropdownMenuSubContentProps {
	id?: string
	alignOffset?: number
	sideOffset?: number
	size?: 'tiny' | 'small' | 'medium' | 'wide'
	className?: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuSubContent({
	id,
	alignOffset = -1,
	sideOffset = -6,
	size = 'small',
	className,
	children,
}: TldrawUiDropdownMenuSubContentProps) {
	const container = useTldrawUiPortalContainer()

	return (
		<_DropdownMenu.Portal container={container}>
			<TldrawUiPortalScope>
				<_DropdownMenu.SubContent
					data-testid={id}
					className={classNames('tl-menu', className)}
					alignOffset={alignOffset}
					sideOffset={sideOffset}
					collisionPadding={4}
					data-size={size}
				>
					{children}
				</_DropdownMenu.SubContent>
			</TldrawUiPortalScope>
		</_DropdownMenu.Portal>
	)
}

/** @public */
export interface TldrawUiDropdownMenuGroupProps {
	children: ReactNode
	className?: string
	'data-testid'?: string
}

/** @public @react */
export function TldrawUiDropdownMenuGroup({
	className,
	children,
	'data-testid': dataTestId,
}: TldrawUiDropdownMenuGroupProps) {
	const { dir } = useTldrawUiTranslation()

	return (
		<div dir={dir} className={classNames('tl-menu__group', className)} data-testid={dataTestId}>
			{children}
		</div>
	)
}

/** @public @react */
export function TldrawUiDropdownMenuIndicator() {
	const { dir, msg } = useTldrawUiTranslation()

	return (
		<_DropdownMenu.ItemIndicator dir={dir} asChild>
			<TldrawUiIcon label={msg('ui.checked', 'Checked')} icon="check" />
		</_DropdownMenu.ItemIndicator>
	)
}

/** @public */
export interface TldrawUiDropdownMenuItemProps {
	noClose?: boolean
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuItem({ noClose, children }: TldrawUiDropdownMenuItemProps) {
	const { dir } = useTldrawUiTranslation()

	return (
		<_DropdownMenu.Item dir={dir} asChild onClick={noClose ? preventDefault : undefined}>
			{children}
		</_DropdownMenu.Item>
	)
}

/** @public */
export interface TldrawUiDropdownMenuCheckboxItemProps {
	checked?: boolean
	onSelect?(e: Event): void
	disabled?: boolean
	title: string
	className?: string
	indicatorClassName?: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuCheckboxItem({
	children,
	onSelect,
	className,
	indicatorClassName,
	...rest
}: TldrawUiDropdownMenuCheckboxItemProps) {
	const { dir, msg } = useTldrawUiTranslation()

	return (
		<_DropdownMenu.CheckboxItem
			dir={dir}
			className={classNames('tl-button tl-button--menu tl-button--checkbox', className)}
			onSelect={(e) => {
				onSelect?.(e)
				preventDefault(e)
			}}
			{...rest}
		>
			<div className={classNames('tl-menu__checkbox-indicator', indicatorClassName)}>
				<_DropdownMenu.ItemIndicator dir={dir}>
					<TldrawUiIcon label={msg('ui.checked', 'Checked')} icon="check" small />
				</_DropdownMenu.ItemIndicator>
			</div>
			{children}
		</_DropdownMenu.CheckboxItem>
	)
}
