import classNames from 'classnames'
import { Select as _Select } from 'radix-ui'
import * as React from 'react'
import { useTldrawUiMenuIsOpen } from '../context/menu-state'
import { TldrawUiPortalScope, useTldrawUiPortalContainer } from '../context/portal'
import { useTldrawUiTranslation } from '../context/translation'
import { TldrawUiIcon, TldrawUiIconJsx } from './TldrawUiIcon'

/* --------------------- Root --------------------- */

/** @public */
export interface TldrawUiSelectProps {
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
}: TldrawUiSelectProps) {
	const [open, setOpen] = useTldrawUiMenuIsOpen(id)
	const { dir } = useTldrawUiTranslation()

	const handleOpenChange = React.useCallback(
		(isOpen: boolean) => {
			setOpen(isOpen)
			onOpenChange?.(isOpen)
		},
		[setOpen, onOpenChange]
	)

	return (
		<_Select.Root
			value={value}
			onValueChange={onValueChange}
			onOpenChange={handleOpenChange}
			open={open}
			disabled={disabled}
			dir={dir}
		>
			<div
				id={id}
				className={classNames('tl-select', className)}
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
export interface TldrawUiSelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode
	className?: string
}

/**
 * The trigger button for the select dropdown.
 *
 * @public
 * @react
 */
export const TldrawUiSelectTrigger = React.forwardRef<
	HTMLButtonElement,
	TldrawUiSelectTriggerProps
>(function TldrawUiSelectTrigger({ children, className, ...props }, ref) {
	return (
		<_Select.Trigger
			ref={ref}
			className={classNames('tl-button tl-select__trigger', className)}
			{...props}
		>
			{children}
			<_Select.Icon className="tl-select__chevron">
				<TldrawUiIcon icon="chevron-down" label="" small />
			</_Select.Icon>
		</_Select.Trigger>
	)
})

/* --------------------- Value --------------------- */

/** @public */
export interface TldrawUiSelectValueProps {
	placeholder?: string
	icon?: string | TldrawUiIconJsx
	children?: React.ReactNode
}

/**
 * Displays the currently selected value in the trigger.
 *
 * @public
 * @react
 */
export function TldrawUiSelectValue({ placeholder, icon, children }: TldrawUiSelectValueProps) {
	return (
		<_Select.Value placeholder={placeholder}>
			<span className="tl-select__value">
				{icon && <TldrawUiIcon icon={icon} label="" small />}
				<span className="tl-button__label">{children}</span>
			</span>
		</_Select.Value>
	)
}

/* --------------------- Content --------------------- */

/** @public */
export interface TldrawUiSelectContentProps {
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
}: TldrawUiSelectContentProps) {
	const container = useTldrawUiPortalContainer()

	return (
		<_Select.Portal container={container}>
			<TldrawUiPortalScope>
				<_Select.Content
					className={classNames('tl-menu tl-select__content', className)}
					position="popper"
					side={side}
					align={align}
					sideOffset={4}
					collisionPadding={4}
				>
					<_Select.Viewport className="tl-select__viewport">{children}</_Select.Viewport>
				</_Select.Content>
			</TldrawUiPortalScope>
		</_Select.Portal>
	)
}

/* --------------------- Item --------------------- */

/** @public */
export interface TldrawUiSelectItemProps {
	value: string
	label: React.ReactNode
	icon?: string | TldrawUiIconJsx
	disabled?: boolean
	destructive?: boolean
	className?: string
}

/**
 * An item in the select dropdown. Styled to match menu checkbox items.
 *
 * @public
 * @react
 */
export function TldrawUiSelectItem({
	value,
	label,
	icon,
	disabled,
	destructive,
	className,
}: TldrawUiSelectItemProps) {
	return (
		<_Select.Item
			value={value}
			disabled={disabled}
			className={classNames(
				'tl-button tl-button--menu tl-button--checkbox tl-select__item',
				destructive && 'tl-select__item--destructive',
				className
			)}
		>
			<TldrawUiIcon small icon="check" label="" className="tl-select__item-indicator" />
			{icon && <TldrawUiIcon icon={icon} label="" small />}
			<_Select.ItemText className="tl-button__label">{label}</_Select.ItemText>
		</_Select.Item>
	)
}
