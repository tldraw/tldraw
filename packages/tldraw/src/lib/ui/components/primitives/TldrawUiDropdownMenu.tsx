import { Menu as _Menu } from '@base-ui/react/menu'
import { preventDefault, useContainer } from '@tldraw/editor'
import classNames from 'classnames'
import { ReactElement, ReactNode } from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
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
		<_Menu.Root open={debugOpen || open} modal={modal} onOpenChange={onOpenChange}>
			{children}
		</_Menu.Root>
	)
}

/** @public */
export interface TLUiDropdownMenuTriggerProps {
	children?: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuTrigger({ children, ...rest }: TLUiDropdownMenuTriggerProps) {
	return (
		<_Menu.Trigger
			render={children as ReactElement}
			// Firefox fix: Stop the dropdown immediately closing after touch
			onTouchEnd={(e) => preventDefault(e)}
			{...rest}
		/>
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
		<_Menu.Portal container={container}>
			<_Menu.Positioner
				className="tlui-menu__positioner"
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				collisionPadding={4}
			>
				<_Menu.Popup className={classNames('tlui-menu', className)}>{children}</_Menu.Popup>
			</_Menu.Positioner>
		</_Menu.Portal>
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
		<_Menu.SubmenuRoot open={open} onOpenChange={onOpenChange}>
			{children}
		</_Menu.SubmenuRoot>
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
	const dir = useDirection()
	return (
		<_Menu.SubmenuTrigger
			disabled={disabled}
			nativeButton
			render={
				<TldrawUiButton
					data-testid={id}
					type="menu"
					className="tlui-menu__submenu__trigger"
					disabled={disabled}
					title={title}
				>
					<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
					<TldrawUiButtonIcon icon={dir === 'rtl' ? 'chevron-left' : 'chevron-right'} small />
				</TldrawUiButton>
			}
		/>
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
		<_Menu.Portal container={container}>
			<_Menu.Positioner
				className="tlui-menu__positioner"
				alignOffset={alignOffset}
				sideOffset={sideOffset}
				collisionPadding={4}
			>
				<_Menu.Popup
					data-testid={id}
					className="tlui-menu tlui-menu__submenu__content"
					data-size={size}
				>
					{children}
				</_Menu.Popup>
			</_Menu.Positioner>
		</_Menu.Portal>
	)
}

/** @public */
export interface TLUiDropdownMenuGroupProps {
	children: ReactNode
	className?: string
}

/** @public @react */
export function TldrawUiDropdownMenuGroup({ className, children }: TLUiDropdownMenuGroupProps) {
	const dir = useDirection()
	return (
		<div dir={dir} className={classNames('tlui-menu__group', className)}>
			{children}
		</div>
	)
}

/** @public @react */
export function TldrawUiDropdownMenuIndicator() {
	const msg = useTranslation()

	return (
		<_Menu.CheckboxItemIndicator render={<TldrawUiIcon label={msg('ui.checked')} icon="check" />} />
	)
}

/** @public */
export interface TLUiDropdownMenuItemProps {
	noClose?: boolean
	children: ReactNode
}

/** @public @react */
export function TldrawUiDropdownMenuItem({ noClose, children }: TLUiDropdownMenuItemProps) {
	// Menu items in tldraw render buttons, so let Base UI know to use native button semantics.
	return <_Menu.Item render={children as ReactElement} closeOnClick={!noClose} nativeButton />
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
		<_Menu.CheckboxItem
			className="tlui-button tlui-button__menu tlui-button__checkbox"
			onClick={(e) => {
				onSelect?.(e.nativeEvent)
			}}
			closeOnClick={false}
			{...rest}
		>
			<div className="tlui-button__checkbox__indicator">
				<_Menu.CheckboxItemIndicator>
					<TldrawUiIcon label={msg('ui.checked')} icon="check" small />
				</_Menu.CheckboxItemIndicator>
			</div>
			{children}
		</_Menu.CheckboxItem>
	)
}
