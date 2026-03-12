import { useContainer } from '@tldraw/editor'
import classNames from 'classnames'
import { Select as _Select } from 'radix-ui'
import * as React from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiIconType } from '../../icon-types'
import { TldrawUiIcon } from './TldrawUiIcon'

/* --------------------- Root --------------------- */

/** @public */
export interface TLUiSelectProps {
	id: string
	value: string
	onValueChange(value: string): void
	onOpenChange?(isOpen: boolean): void
	disabled?: boolean
	className?: string
	children: React.ReactNode
	'data-testid'?: string
	'aria-label'?: string
}

/**
 * A select dropdown component.
 *
 * @example
 * ```tsx
 * <TldrawUiSelect id="my-select" value={value} onValueChange={setValue}>
 *   <TldrawUiSelectTrigger>
 *     <TldrawUiSelectValue placeholder="Select..." />
 *   </TldrawUiSelectTrigger>
 *   <TldrawUiSelectContent>
 *     <TldrawUiSelectItem value="one" label="One" />
 *     <TldrawUiSelectItem value="two" label="Two" />
 *   </TldrawUiSelectContent>
 * </TldrawUiSelect>
 * ```
 *
 * @public
 * @react
 */
export function TldrawUiSelect({
	id,
	value,
	onValueChange,
	onOpenChange,
	disabled,
	className,
	children,
	'data-testid': dataTestId,
	'aria-label': ariaLabel,
}: TLUiSelectProps) {
	const [open, handleOpenChange] = useMenuIsOpen(id, onOpenChange)

	return (
		<_Select.Root
			value={value}
			onValueChange={onValueChange}
			onOpenChange={handleOpenChange}
			open={open}
			disabled={disabled}
			dir="ltr"
		>
			<div
				id={id}
				className={classNames('tlui-select', className)}
				data-testid={dataTestId}
				aria-label={ariaLabel}
			>
				{children}
			</div>
		</_Select.Root>
	)
}

/* --------------------- Trigger --------------------- */

/** @public */
export interface TLUiSelectTriggerProps {
	children: React.ReactNode
	className?: string
}

/**
 * The trigger button for the select dropdown.
 *
 * @public
 * @react
 */
export const TldrawUiSelectTrigger = React.forwardRef<HTMLButtonElement, TLUiSelectTriggerProps>(
	function TldrawUiSelectTrigger({ children, className }, ref) {
		return (
			<_Select.Trigger
				ref={ref}
				className={classNames('tlui-button tlui-select__trigger', className)}
			>
				{children}
				<_Select.Icon className="tlui-select__chevron">
					<TldrawUiIcon icon="chevron-down" label="" small />
				</_Select.Icon>
			</_Select.Trigger>
		)
	}
)

/* --------------------- Value --------------------- */

/** @public */
export interface TLUiSelectValueProps {
	placeholder?: string
	icon?: TLUiIconType | Exclude<string, TLUiIconType>
	children?: React.ReactNode
}

/**
 * Displays the currently selected value in the trigger.
 *
 * @public
 * @react
 */
export function TldrawUiSelectValue({ placeholder, icon, children }: TLUiSelectValueProps) {
	return (
		<_Select.Value placeholder={placeholder}>
			<span className="tlui-select__value">
				{icon && <TldrawUiIcon icon={icon} label="" small />}
				<span className="tlui-button__label">{children}</span>
			</span>
		</_Select.Value>
	)
}

/* --------------------- Content --------------------- */

/** @public */
export interface TLUiSelectContentProps {
	children: React.ReactNode
	side?: 'top' | 'bottom'
	align?: 'start' | 'center' | 'end'
	className?: string
}

/**
 * The dropdown content container for select items.
 *
 * @public
 * @react
 */
export function TldrawUiSelectContent({
	children,
	side = 'bottom',
	align = 'start',
	className,
}: TLUiSelectContentProps) {
	const container = useContainer()

	return (
		<_Select.Portal container={container}>
			<_Select.Content
				className={classNames('tlui-menu tlui-select__content', className)}
				position="popper"
				side={side}
				align={align}
				sideOffset={4}
				collisionPadding={4}
			>
				<_Select.Viewport className="tlui-select__viewport">{children}</_Select.Viewport>
			</_Select.Content>
		</_Select.Portal>
	)
}

/* --------------------- Item --------------------- */

/** @public */
export interface TLUiSelectItemProps {
	value: string
	label: string
	icon?: TLUiIconType | Exclude<string, TLUiIconType>
	disabled?: boolean
	className?: string
}

/**
 * An item in the select dropdown. Styled to match TldrawUiMenuCheckboxItem.
 *
 * @public
 * @react
 */
export function TldrawUiSelectItem({
	value,
	label,
	icon,
	disabled,
	className,
}: TLUiSelectItemProps) {
	return (
		<_Select.Item
			value={value}
			disabled={disabled}
			className={classNames(
				'tlui-button tlui-button__menu tlui-button__checkbox tlui-select__item',
				className
			)}
		>
			<TldrawUiIcon small icon="check" label="" className="tlui-select__item-indicator" />
			{icon && <TldrawUiIcon icon={icon} label="" small />}
			<_Select.ItemText className="tlui-button__label">{label}</_Select.ItemText>
		</_Select.Item>
	)
}
