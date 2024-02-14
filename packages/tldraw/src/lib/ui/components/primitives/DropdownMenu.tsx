import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault, useContainer } from '@tldraw/editor'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { Button, TLUiButtonProps } from './Button'
import { Icon } from './Icon'

/** @public */
export type TLUiDropdownProps = {
	id: string
	children: any
	modal?: boolean
	debugOpen?: boolean
}

/** @public */
export function Dropdown({ id, children, modal = false, debugOpen = false }: TLUiDropdownProps) {
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
export type TLUiDropdownTriggerProps = {
	id?: string
	children: any
}

/** @public */
export function DropdownTrigger({ id, children }: TLUiDropdownTriggerProps) {
	return (
		<_DropdownMenu.Trigger
			dir="ltr"
			data-testid={id}
			asChild
			// Firefox fix: Stop the dropdown immediately closing after touch
			onTouchEnd={(e) => preventDefault(e)}
		>
			{children}
		</_DropdownMenu.Trigger>
	)
}

/** @public */
export type TLUiDropdownContentProps = {
	id?: string
	children: any
	alignOffset?: number
	sideOffset?: number
	align?: 'start' | 'center' | 'end'
	side?: 'bottom' | 'top' | 'right' | 'left'
}

/** @public */
export function DropdownContent({
	id,
	side = 'bottom',
	align = 'start',
	sideOffset = 8,
	alignOffset = 8,
	children,
}: TLUiDropdownContentProps) {
	const container = useContainer()

	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.Content
				data-testid={id}
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
export type TLUiDropdownSubProps = { id: string; children: any }

/** @public */
export function DropdownSub({ id, children }: TLUiDropdownSubProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<_DropdownMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_DropdownMenu.Sub>
	)
}

/** @public */
export type TLUiDropdownSubTriggerProps = {
	label: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	id?: string
	'data-direction'?: 'left' | 'right'
}

/** @public */
export function DropdownSubTrigger({
	label,
	id,
	'data-direction': dataDirection,
}: TLUiDropdownSubTriggerProps) {
	return (
		<_DropdownMenu.SubTrigger dir="ltr" data-direction={dataDirection} data-testid={id} asChild>
			<Button
				type="menu"
				className="tlui-menu__submenu__trigger"
				label={label}
				icon="chevron-right"
			/>
		</_DropdownMenu.SubTrigger>
	)
}

/** @public */
export type TLUiDropdownSubContentProps = {
	id?: string
	alignOffset?: number
	sideOffset?: number
	children: any
}

/** @public */
export function DropdownSubContent({
	id,
	alignOffset = 0,
	sideOffset = 5,
	children,
}: TLUiDropdownSubContentProps) {
	const container = useContainer()
	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.SubContent
				data-testid={id}
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
export type TLUiDropdownGroupProps = {
	id?: string
	children: any
	size?: 'tiny' | 'small' | 'medium' | 'wide'
}

/** @public */
export function DropdownGroup({ id, children, size = 'medium' }: TLUiDropdownGroupProps) {
	return (
		<_DropdownMenu.Group dir="ltr" className="tlui-menu__group" data-size={size} data-testid={id}>
			{children}
		</_DropdownMenu.Group>
	)
}

/** @public */
export function DropdownIndicator() {
	return (
		<_DropdownMenu.ItemIndicator dir="ltr" asChild>
			<Icon icon="check" />
		</_DropdownMenu.ItemIndicator>
	)
}

/** @public */
export interface TLUiDropdownItemProps extends TLUiButtonProps {
	id?: string
	noClose?: boolean
}

/** @public */
export function DropdownItem({ id, noClose, ...props }: TLUiDropdownItemProps) {
	return (
		<_DropdownMenu.Item
			dir="ltr"
			asChild
			data-testid={id}
			onClick={noClose || props.isChecked !== undefined ? preventDefault : undefined}
		>
			<Button {...props} />
		</_DropdownMenu.Item>
	)
}

/** @public */
export interface TLUiDropdownCheckboxItemProps {
	id?: string
	checked?: boolean
	onSelect?: (e: Event) => void
	disabled?: boolean
	title: string
	children: any
}

/** @public */
export function DropdownCheckboxItem({
	id,
	children,
	onSelect,
	...rest
}: TLUiDropdownCheckboxItemProps) {
	return (
		<_DropdownMenu.CheckboxItem
			dir="ltr"
			data-testid={id}
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
export interface TLUiDropdownRadioItemProps {
	checked?: boolean
	onSelect?: (e: Event) => void
	disabled?: boolean
	title: string
	children: any
}

/** @public */
export function DropdownRadioItem({ children, ...rest }: TLUiDropdownRadioItemProps) {
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
