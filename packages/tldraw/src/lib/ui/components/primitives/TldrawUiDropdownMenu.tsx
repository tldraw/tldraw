import { preventDefault, useContainer } from '@tldraw/editor'
import classNames from 'classnames'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { ReactNode } from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from './Button/TldrawUiButton'
import { TldrawUiButtonIcon } from './Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from './Button/TldrawUiButtonLabel'
import { TldrawUiIcon } from './TldrawUiIcon'

/** @public */
export interface TLUiDropdownMenuRootProps {
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
}: TLUiDropdownMenuRootProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<_DropdownMenu.Root
			open={debugOpen || open}
			dir="ltr"
			modal={modal}
			onOpenChange={onOpenChange}
		>
			{children}
		</_DropdownMenu.Root>
	)
}

/** @public */
export interface TLUiDropdownMenuTriggerProps {
	children?: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuTrigger({ children, ...rest }: TLUiDropdownMenuTriggerProps) {
	return (
		<_DropdownMenu.Trigger
			dir="ltr"
			asChild
			// Firefox fix: Stop the dropdown immediately closing after touch
			onTouchEnd={(e) => preventDefault(e)}
			{...rest}
		>
			{children}
		</_DropdownMenu.Trigger>
	)
}

/** @public */
export interface TLUiDropdownMenuContentProps {
	id?: string
	className?: string
	side?: 'bottom' | 'top' | 'right' | 'left'
	align?: 'start' | 'center' | 'end'
	sideOffset?: number
	alignOffset?: number
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuContent({
	className,
	side = 'bottom',
	align = 'start',
	sideOffset = 8,
	alignOffset = 8,
	children,
}: TLUiDropdownMenuContentProps) {
	const container = useContainer()

	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.Content
				className={classNames('tlui-menu', className)}
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				collisionPadding={4}
			>
				{children}
			</_DropdownMenu.Content>
		</_DropdownMenu.Portal>
	)
}

/** @public */
export interface TLUiDropdownMenuSubProps {
	id: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuSub({ id, children }: TLUiDropdownMenuSubProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<_DropdownMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_DropdownMenu.Sub>
	)
}

/** @public */
export interface TLUiDropdownMenuSubTriggerProps {
	label: string
	id?: string
	title?: string
	disabled?: boolean
}

/** @public @react */
export function TldrawUiDropdownMenuSubTrigger({
	id,
	label,
	title,
	disabled,
}: TLUiDropdownMenuSubTriggerProps) {
	return (
		<_DropdownMenu.SubTrigger dir="ltr" asChild disabled={disabled}>
			<TldrawUiButton
				data-testid={id}
				type="menu"
				className="tlui-menu__submenu__trigger"
				disabled={disabled}
				title={title}
			>
				<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
				<TldrawUiButtonIcon icon="chevron-right" small />
			</TldrawUiButton>
		</_DropdownMenu.SubTrigger>
	)
}

/** @public */
export interface TLUiDropdownMenuSubContentProps {
	id?: string
	alignOffset?: number
	sideOffset?: number
	size?: 'tiny' | 'small' | 'medium' | 'wide'
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuSubContent({
	id,
	alignOffset = -1,
	sideOffset = -6,
	size = 'small',
	children,
}: TLUiDropdownMenuSubContentProps) {
	const container = useContainer()
	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.SubContent
				data-testid={id}
				className="tlui-menu tlui-menu__submenu__content"
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
export interface TLUiDropdownMenuGroupProps {
	children: ReactNode
	className?: string
}

/** @public @react */
export function TldrawUiDropdownMenuGroup({ className, children }: TLUiDropdownMenuGroupProps) {
	return (
		<div dir="ltr" className={classNames('tlui-menu__group', className)}>
			{children}
		</div>
	)
}

/** @public @react */
export function TldrawUiDropdownMenuIndicator() {
	const msg = useTranslation()

	return (
		<_DropdownMenu.ItemIndicator dir="ltr" asChild>
			<TldrawUiIcon label={msg('ui.checked')} icon="check" />
		</_DropdownMenu.ItemIndicator>
	)
}

/** @public */
export interface TLUiDropdownMenuItemProps {
	noClose?: boolean
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuItem({ noClose, children }: TLUiDropdownMenuItemProps) {
	return (
		<_DropdownMenu.Item dir="ltr" asChild onClick={noClose ? preventDefault : undefined}>
			{children}
		</_DropdownMenu.Item>
	)
}

/** @public */
export interface TLUiDropdownMenuCheckboxItemProps {
	checked?: boolean
	onSelect?(e: Event): void
	disabled?: boolean
	title: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuCheckboxItem({
	children,
	onSelect,
	...rest
}: TLUiDropdownMenuCheckboxItemProps) {
	const msg = useTranslation()

	return (
		<_DropdownMenu.CheckboxItem
			dir="ltr"
			className="tlui-button tlui-button__menu tlui-button__checkbox"
			onSelect={(e) => {
				onSelect?.(e)
				preventDefault(e)
			}}
			{...rest}
		>
			<div className="tlui-button__checkbox__indicator">
				<_DropdownMenu.ItemIndicator dir="ltr">
					<TldrawUiIcon label={msg('ui.checked')} icon="check" small />
				</_DropdownMenu.ItemIndicator>
			</div>
			{children}
		</_DropdownMenu.CheckboxItem>
	)
}
