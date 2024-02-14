import * as _ContextMenu from '@radix-ui/react-context-menu'
import { preventDefault, useContainer } from '@tldraw/editor'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { Button, TLUiButtonProps } from './Button'
import { Icon } from './Icon'

/** @public */
export type TLUiContextMenuProps = {
	id: string
	children: any
	modal?: boolean
	debugOpen?: boolean
}

/** @public */
export function ContextMenu({ id, children, modal = false }: TLUiContextMenuProps) {
	const [_, onOpenChange] = useMenuIsOpen(id)

	return (
		<_ContextMenu.Root dir="ltr" modal={modal} onOpenChange={onOpenChange}>
			{children}
		</_ContextMenu.Root>
	)
}

/** @public */
export type TLUiContextMenuTriggerProps = {
	id?: string
	children: any
}

/** @public */
export function ContextMenuTrigger({ id, children }: TLUiContextMenuTriggerProps) {
	return (
		<_ContextMenu.Trigger
			dir="ltr"
			data-testid={id}
			asChild
			// Firefox fix: Stop the ContextMenu immediately closing after touch
			onTouchEnd={(e) => preventDefault(e)}
		>
			{children}
		</_ContextMenu.Trigger>
	)
}

/** @public */
export type TLUiContextMenuContentProps = {
	id?: string
	children: any
	alignOffset?: number
	sideOffset?: number
	align?: 'start' | 'center' | 'end'
	side?: 'bottom' | 'top' | 'right' | 'left'
}

/** @public */
export function ContextMenuContent({
	id,
	alignOffset = -4,
	children,
}: TLUiContextMenuContentProps) {
	const container = useContainer()

	return (
		<_ContextMenu.Portal container={container}>
			<_ContextMenu.Content
				data-testid={id}
				className="tlui-menu"
				alignOffset={alignOffset}
				collisionPadding={4}
			>
				{children}
			</_ContextMenu.Content>
		</_ContextMenu.Portal>
	)
}

/** @public */
export type TLUiContextMenuSubProps = { id: string; children: any }

/** @public */
export function ContextMenuSub({ id, children }: TLUiContextMenuSubProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<_ContextMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_ContextMenu.Sub>
	)
}

/** @public */
export type TLUiContextMenuSubTriggerProps = {
	label: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	id?: string
	disabled?: boolean
	'data-direction'?: 'left' | 'right'
}

/** @public */
export function ContextMenuSubTrigger({
	label,
	id,
	disabled,
	'data-direction': dataDirection,
}: TLUiContextMenuSubTriggerProps) {
	return (
		<_ContextMenu.SubTrigger
			dir="ltr"
			disabled={disabled}
			data-direction={dataDirection}
			data-testid={id}
			asChild
		>
			<Button
				type="menu"
				className="tlui-menu__submenu__trigger"
				label={label}
				icon="chevron-right"
			/>
		</_ContextMenu.SubTrigger>
	)
}

/** @public */
export type TLUiContextMenuSubContentProps = {
	id?: string
	alignOffset?: number
	sideOffset?: number
	children: any
}

/** @public */
export function ContextMenuSubContent({
	id,
	sideOffset = 4,
	alignOffset = 1,
	children,
}: TLUiContextMenuSubContentProps) {
	const container = useContainer()
	return (
		<_ContextMenu.Portal container={container}>
			<_ContextMenu.SubContent
				data-testid={id}
				className="tlui-menu tlui-menu__submenu__content"
				alignOffset={alignOffset}
				sideOffset={sideOffset}
				collisionPadding={4}
			>
				{children}
			</_ContextMenu.SubContent>
		</_ContextMenu.Portal>
	)
}

/** @public */
export type TLUiContextMenuGroupProps = {
	id?: string
	children: any
	size?: 'tiny' | 'small' | 'medium' | 'wide'
}

/** @public */
export function ContextMenuGroup({ id, children, size = 'medium' }: TLUiContextMenuGroupProps) {
	return (
		<_ContextMenu.Group dir="ltr" className="tlui-menu__group" data-size={size} data-testid={id}>
			{children}
		</_ContextMenu.Group>
	)
}

/** @public */
export function ContextMenuIndicator() {
	return (
		<_ContextMenu.ItemIndicator dir="ltr" asChild>
			<Icon icon="check" />
		</_ContextMenu.ItemIndicator>
	)
}

/** @public */
export interface TLUiContextMenuItemProps extends TLUiButtonProps {
	id?: string
	noClose?: boolean
}

/** @public */
export function ContextMenuItem({ id, noClose, ...props }: TLUiContextMenuItemProps) {
	return (
		<_ContextMenu.Item
			dir="ltr"
			asChild
			data-testid={id}
			onClick={noClose || props.isChecked !== undefined ? preventDefault : undefined}
		>
			<Button {...props} data-testid={id} />
		</_ContextMenu.Item>
	)
}

/** @public */
export interface TLUiContextMenuCheckboxItemProps {
	id?: string
	checked?: boolean
	onSelect?: (e: Event) => void
	disabled?: boolean
	title: string
	children: any
}

/** @public */
export function ContextMenuCheckboxItem({
	id,
	children,
	onSelect,
	...rest
}: TLUiContextMenuCheckboxItemProps) {
	return (
		<_ContextMenu.CheckboxItem
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
				<_ContextMenu.ItemIndicator dir="ltr">
					<Icon icon="check" small />
				</_ContextMenu.ItemIndicator>
			</div>
			{children}
		</_ContextMenu.CheckboxItem>
	)
}

/** @public */
export interface TLUiContextMenuRadioItemProps {
	checked?: boolean
	onSelect?: (e: Event) => void
	disabled?: boolean
	title: string
	children: any
}

/** @public */
export function ContextMenuRadioItem({ children, ...rest }: TLUiContextMenuRadioItemProps) {
	return (
		<_ContextMenu.CheckboxItem
			dir="ltr"
			className="tlui-button tlui-button__menu tlui-button__checkbox"
			{...rest}
			onSelect={(e) => {
				preventDefault(e)
				rest.onSelect?.(e)
			}}
		>
			<div className="tlui-button__checkbox__indicator">
				<_ContextMenu.ItemIndicator dir="ltr">
					<Icon icon="check" small />
				</_ContextMenu.ItemIndicator>
			</div>
			{children}
		</_ContextMenu.CheckboxItem>
	)
}
