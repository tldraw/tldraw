import * as _ContextMenu from '@radix-ui/react-context-menu'
import { preventDefault, useContainer } from '@tldraw/editor'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { Button, TLUiButtonProps } from './Button'

/** @private */
export type TLUiContextMenuSubProps = { id: string; children: any }

/** @private */
export function ContextMenuSub({ id, children }: TLUiContextMenuSubProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<_ContextMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</_ContextMenu.Sub>
	)
}

/** @private */
export type TLUiContextMenuSubTriggerProps = {
	label: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	id?: string
	disabled?: boolean
	'data-direction'?: 'left' | 'right'
}

/** @private */
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

/** @private */
export type TLUiContextMenuSubContentProps = {
	id?: string
	alignOffset?: number
	sideOffset?: number
	children: any
}

/** @private */
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

/** @private */
export type TLUiContextMenuGroupProps = {
	id?: string
	children: any
	size?: 'tiny' | 'small' | 'medium' | 'wide'
}

/** @private */
export function ContextMenuGroup({ id, children, size = 'medium' }: TLUiContextMenuGroupProps) {
	return (
		<_ContextMenu.Group dir="ltr" className="tlui-menu__group" data-size={size} data-testid={id}>
			{children}
		</_ContextMenu.Group>
	)
}

/** @private */
export interface TLUiContextMenuItemProps extends TLUiButtonProps {
	id?: string
	noClose?: boolean
}

/** @private */
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
