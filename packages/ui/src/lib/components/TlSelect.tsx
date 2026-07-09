import classNames from 'classnames'
import { Select as _Select } from 'radix-ui'
import * as React from 'react'
import { useTlMenuIsOpen } from '../context/menu-state'
import { TlPortalScope, useTlPortalContainer } from '../context/portal'
import { useTlTranslation } from '../context/translation'
import { TlIcon, TlIconJsx } from './TlIcon'

/* --------------------- Root --------------------- */

/** @public */
export interface TlSelectProps {
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
 * <TlSelect id="my-select" value={value} onValueChange={setValue}>
 *   <TlSelectTrigger>
 *     <TlSelectValue placeholder="Select..." />
 *   </TlSelectTrigger>
 *   <TlSelectContent>
 *     <TlSelectItem value="one" label="One" />
 *     <TlSelectItem value="two" label="Two" />
 *   </TlSelectContent>
 * </TlSelect>
 * ```
 *
 * @public
 * @react
 */
export function TlSelect({
	id,
	value,
	onValueChange,
	onOpenChange,
	disabled,
	className,
	children,
	'data-testid': dataTestId,
	'aria-label': ariaLabel,
}: TlSelectProps) {
	const [open, setOpen] = useTlMenuIsOpen(id)
	const { dir } = useTlTranslation()

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
export interface TlSelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode
	className?: string
}

/**
 * The trigger button for the select dropdown.
 *
 * @public
 * @react
 */
export const TlSelectTrigger = React.forwardRef<HTMLButtonElement, TlSelectTriggerProps>(
	function TlSelectTrigger({ children, className, ...props }, ref) {
		return (
			<_Select.Trigger
				ref={ref}
				className={classNames('tl-button tl-select__trigger', className)}
				{...props}
			>
				{children}
				<_Select.Icon className="tl-select__chevron">
					<TlIcon icon="chevron-down" label="" small />
				</_Select.Icon>
			</_Select.Trigger>
		)
	}
)

/* --------------------- Value --------------------- */

/** @public */
export interface TlSelectValueProps {
	placeholder?: string
	icon?: string | TlIconJsx
	children?: React.ReactNode
}

/**
 * Displays the currently selected value in the trigger.
 *
 * @public
 * @react
 */
export function TlSelectValue({ placeholder, icon, children }: TlSelectValueProps) {
	return (
		<_Select.Value placeholder={placeholder}>
			<span className="tl-select__value">
				{icon && <TlIcon icon={icon} label="" small />}
				<span className="tl-button__label">{children}</span>
			</span>
		</_Select.Value>
	)
}

/* --------------------- Content --------------------- */

/** @public */
export interface TlSelectContentProps {
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
export function TlSelectContent({
	children,
	side = 'bottom',
	align = 'start',
	className,
}: TlSelectContentProps) {
	const container = useTlPortalContainer()

	return (
		<_Select.Portal container={container}>
			<TlPortalScope>
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
			</TlPortalScope>
		</_Select.Portal>
	)
}

/* --------------------- Item --------------------- */

/** @public */
export interface TlSelectItemProps {
	value: string
	label: React.ReactNode
	icon?: string | TlIconJsx
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
export function TlSelectItem({
	value,
	label,
	icon,
	disabled,
	destructive,
	className,
}: TlSelectItemProps) {
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
			<TlIcon small icon="check" label="" className="tl-select__item-indicator" />
			{icon && <TlIcon icon={icon} label="" small />}
			<_Select.ItemText className="tl-button__label">{label}</_Select.ItemText>
		</_Select.Item>
	)
}
