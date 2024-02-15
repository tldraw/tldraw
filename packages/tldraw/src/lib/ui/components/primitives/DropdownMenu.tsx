import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault, useContainer } from '@tldraw/editor'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TldrawUiButton } from './Button/TldrawUiButton'
import { TldrawUiButtonIcon } from './Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from './Button/TldrawUiButtonLabel'
import { Icon } from './Icon'

/** @public */
export type TLUiDropdownMenuRootProps = {
	id: string
	children: any
	modal?: boolean
	debugOpen?: boolean
}

/** @public */
export function DropdownMenuRoot({
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
	children?: any
}

/** @public */
export function DropdownMenuTrigger({ children }: TLUiDropdownMenuTriggerProps) {
	return (
		<_DropdownMenu.Trigger
			dir="ltr"
			asChild
			// Firefox fix: Stop the dropdown immediately closing after touch
			onTouchEnd={(e) => preventDefault(e)}
		>
			{children}
		</_DropdownMenu.Trigger>
	)
}

/** @public */
export type TLUiDropdownMenuContentProps = {
	id?: string
	children: any
	alignOffset?: number
	sideOffset?: number
	align?: 'start' | 'center' | 'end'
	side?: 'bottom' | 'top' | 'right' | 'left'
}

/** @public */
export function DropdownMenuContent({
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
export type TLUiDropdownMenuSubProps = { id: string; children: any }

/** @public */
export function DropdownMenuSub({ id, children }: TLUiDropdownMenuSubProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<_DropdownMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_DropdownMenu.Sub>
	)
}

/** @public */
export type TLUiDropdownMenuSubTriggerProps = {
	label: string
	id?: string
	title?: string
	disabled?: boolean
}

/** @public */
export function DropdownMenuSubTrigger({
	label,
	title,
	disabled,
}: TLUiDropdownMenuSubTriggerProps) {
	return (
		<_DropdownMenu.SubTrigger dir="ltr" asChild>
			<TldrawUiButton
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
export type TLUiDropdownMenuSubContentProps = {
	id?: string
	alignOffset?: number
	sideOffset?: number
	children: any
}

/** @public */
export function DropdownMenuSubContent({
	alignOffset = -1,
	sideOffset = -4,
	children,
}: TLUiDropdownMenuSubContentProps) {
	const container = useContainer()
	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.SubContent
				className="tlui-menu tlui-menu__submenu__content"
				alignOffset={alignOffset}
				sideOffset={sideOffset}
				collisionPadding={4}
			>
				{children}
			</_DropdownMenu.SubContent>
		</_DropdownMenu.Portal>
	)
}

/** @public */
export type TLUiDropdownMenuGroupProps = {
	children: any
	size?: 'tiny' | 'small' | 'medium' | 'wide'
}

/** @public */
export function DropdownMenuGroup({ children, size = 'medium' }: TLUiDropdownMenuGroupProps) {
	return (
		<_DropdownMenu.Group dir="ltr" className="tlui-menu__group" data-size={size}>
			{children}
		</_DropdownMenu.Group>
	)
}

/** @public */
export function DropdownMenuIndicator() {
	return (
		<_DropdownMenu.ItemIndicator dir="ltr" asChild>
			<Icon icon="check" />
		</_DropdownMenu.ItemIndicator>
	)
}

/** @public */
export interface TLUiDropdownMenuItemProps {
	noClose?: boolean
	children: any
}

/** @public */
export function DropdownMenuItem({ noClose, children }: TLUiDropdownMenuItemProps) {
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
	children: any
}

/** @public */
export function DropdownMenuCheckboxItem({
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
					<Icon icon="check" small />
				</_DropdownMenu.ItemIndicator>
			</div>
			{children}
		</_DropdownMenu.CheckboxItem>
	)
}

/** @public */
export interface TLUiDropdownMenuRadioItemProps {
	checked?: boolean
	onSelect?: (e: Event) => void
	disabled?: boolean
	title: string
	children: any
}

/** @public */
export function DropdownMenuRadioItem({ children, ...rest }: TLUiDropdownMenuRadioItemProps) {
	return (
		<_DropdownMenu.CheckboxItem
			dir="ltr"
			className="tlui-button tlui-button__menu tlui-button__checkbox"
			{...rest}
			onSelect={(e) => {
				preventDefault(e)
				rest.onSelect?.(e)
			}}
		>
			<div className="tlui-button__checkbox__indicator">
				<_DropdownMenu.ItemIndicator dir="ltr">
					<Icon icon="check" small />
				</_DropdownMenu.ItemIndicator>
			</div>
			{children}
		</_DropdownMenu.CheckboxItem>
	)
}
