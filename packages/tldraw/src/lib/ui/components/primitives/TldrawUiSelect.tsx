import { preventDefault, useContainer } from '@tldraw/editor'
import classNames from 'classnames'
import { Select as _Select } from 'radix-ui'
import { ReactNode } from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TldrawUiIcon } from './TldrawUiIcon'

/** @public */
export interface TLUiSelectRootProps {
	id: string
	children: ReactNode
	value?: string
	defaultValue?: string
	onValueChange?(value: string): void
	disabled?: boolean
	open?: boolean
	defaultOpen?: boolean
}

/** @public @react */
export function TldrawUiSelectRoot({
	id,
	children,
	value,
	defaultValue,
	onValueChange,
	disabled,
	open: openProp,
	defaultOpen,
}: TLUiSelectRootProps) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<_Select.Root
			open={openProp ?? open}
			defaultOpen={defaultOpen}
			onOpenChange={onOpenChange}
			value={value}
			defaultValue={defaultValue}
			onValueChange={onValueChange}
			disabled={disabled}
			dir="ltr"
		>
			{children}
		</_Select.Root>
	)
}

/** @public */
export interface TLUiSelectTriggerProps {
	children?: ReactNode
	className?: string
	title?: string
	'data-testid'?: string
	placeholder?: string
}

/** @public @react */
export function TldrawUiSelectTrigger({
	children,
	className,
	title,
	placeholder,
	['data-testid']: testId,
}: TLUiSelectTriggerProps) {
	return (
		<_Select.Trigger
			dir="ltr"
			className={classNames('tlui-select__trigger', className)}
			title={title}
			data-testid={testId}
			// Firefox fix: Stop the select immediately closing after touch
			onTouchEnd={(e) => preventDefault(e)}
		>
			{children ?? (
				<>
					<_Select.Value placeholder={placeholder} />
					<_Select.Icon className="tlui-select__icon">
						<TldrawUiIcon icon="chevron-down" label="" small />
					</_Select.Icon>
				</>
			)}
		</_Select.Trigger>
	)
}

/** @public */
export interface TLUiSelectValueProps {
	placeholder?: string
	className?: string
}

/** @public @react */
export function TldrawUiSelectValue({ placeholder, className }: TLUiSelectValueProps) {
	return <_Select.Value placeholder={placeholder} className={className} />
}

/** @public */
export interface TLUiSelectIconProps {
	children?: ReactNode
	className?: string
}

/** @public @react */
export function TldrawUiSelectIcon({ children, className }: TLUiSelectIconProps) {
	return (
		<_Select.Icon className={classNames('tlui-select__icon', className)}>
			{children ?? <TldrawUiIcon icon="chevron-down" label="" small />}
		</_Select.Icon>
	)
}

/** @public */
export interface TLUiSelectContentProps {
	children: ReactNode
	className?: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	sideOffset?: number
	align?: 'start' | 'center' | 'end'
	alignOffset?: number
	position?: 'item-aligned' | 'popper'
}

/** @public @react */
export function TldrawUiSelectContent({
	children,
	className,
	side = 'bottom',
	sideOffset = 8,
	align = 'start',
	alignOffset = 0,
	position = 'popper',
}: TLUiSelectContentProps) {
	const container = useContainer()

	return (
		<_Select.Portal container={container}>
			<_Select.Content
				className={classNames('tlui-select__content tlui-menu', className)}
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				position={position}
				collisionPadding={4}
			>
				<_Select.Viewport className="tlui-select__viewport">{children}</_Select.Viewport>
			</_Select.Content>
		</_Select.Portal>
	)
}

/** @public */
export interface TLUiSelectGroupProps {
	children: ReactNode
	className?: string
}

/** @public @react */
export function TldrawUiSelectGroup({ children, className }: TLUiSelectGroupProps) {
	return (
		<_Select.Group className={classNames('tlui-select__group tlui-menu__group', className)}>
			{children}
		</_Select.Group>
	)
}

/** @public */
export interface TLUiSelectLabelProps {
	children: ReactNode
	className?: string
}

/** @public @react */
export function TldrawUiSelectLabel({ children, className }: TLUiSelectLabelProps) {
	return (
		<_Select.Label className={classNames('tlui-select__label', className)}>
			{children}
		</_Select.Label>
	)
}

/** @public */
export interface TLUiSelectItemProps {
	children: ReactNode
	value: string
	disabled?: boolean
	className?: string
	'data-testid'?: string
}

/** @public @react */
export function TldrawUiSelectItem({
	children,
	value,
	disabled,
	className,
	['data-testid']: testId,
}: TLUiSelectItemProps) {
	return (
		<_Select.Item
			dir="ltr"
			className={classNames('tlui-select__item tlui-button tlui-button__menu', className)}
			value={value}
			disabled={disabled}
			data-testid={testId}
		>
			<_Select.ItemText>{children}</_Select.ItemText>
			<_Select.ItemIndicator className="tlui-select__item-indicator">
				<TldrawUiIcon icon="check" label="" small />
			</_Select.ItemIndicator>
		</_Select.Item>
	)
}

/** @public @react */
export function TldrawUiSelectSeparator() {
	return <_Select.Separator className="tlui-select__separator" />
}
