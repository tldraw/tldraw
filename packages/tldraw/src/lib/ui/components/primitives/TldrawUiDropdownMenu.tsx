import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault, useContainer } from '@tldraw/editor'
import { ReactNode } from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
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

/** @public */
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

/** @public */
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
	children: ReactNode
	alignOffset?: number
	sideOffset?: number
	align?: 'start' | 'center' | 'end'
	side?: 'bottom' | 'top' | 'right' | 'left'
}

/** @public */
export function TldrawUiDropdownMenuContent({
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
				className="tlui-menu"
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

/** @public */
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

/** @public */
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

/** @public */
export function TldrawUiDropdownMenuSubContent({
	id,
	alignOffset = -1,
	sideOffset = -4,
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
}

/** @public */
export function TldrawUiDropdownMenuGroup({ children }: TLUiDropdownMenuGroupProps) {
	return (
		<_DropdownMenu.Group dir="ltr" className="tlui-menu__group">
			{children}
		</_DropdownMenu.Group>
	)
}

/** @public */
export function TldrawUiDropdownMenuIndicator() {
	return (
		<_DropdownMenu.ItemIndicator dir="ltr" asChild>
			<TldrawUiIcon icon="check" />
		</_DropdownMenu.ItemIndicator>
	)
}

/** @public */
export interface TLUiDropdownMenuItemProps {
	noClose?: boolean
	children: ReactNode
}

/** @public */
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
	onSelect?: (e: Event) => void
	disabled?: boolean
	title: string
	children: ReactNode
}

/** @public */
export function TldrawUiDropdownMenuCheckboxItem({
	children,
	onSelect,
	...rest
}: TLUiDropdownMenuCheckboxItemProps) {
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
					<TldrawUiIcon icon="check" small />
				</_DropdownMenu.ItemIndicator>
			</div>
			{children}
		</_DropdownMenu.CheckboxItem>
	)
}
