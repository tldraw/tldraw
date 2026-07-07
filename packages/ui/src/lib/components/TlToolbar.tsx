import classnames from 'classnames'
import { Toolbar as _Toolbar } from 'radix-ui'
import React from 'react'
import { TlColumn, TlGrid, TlRow } from './layout'
import { TlTooltip } from './TlTooltip'

/** @public */
export interface TlToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	label: string
	orientation?: 'horizontal' | 'vertical' | 'grid'
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}

const LayoutByOrientation = {
	horizontal: TlRow,
	vertical: TlColumn,
	grid: TlGrid,
}

/** @public @react */
export const TlToolbar = React.forwardRef<HTMLDivElement, TlToolbarProps>(
	(
		{
			children,
			className,
			label,
			orientation = 'horizontal',
			tooltipSide,
			...props
		}: TlToolbarProps,
		ref
	) => {
		const Layout = LayoutByOrientation[orientation]
		return (
			<Layout asChild tooltipSide={tooltipSide}>
				<_Toolbar.Root
					ref={ref}
					{...props}
					className={classnames('tl-toolbar', className)}
					aria-label={label}
					orientation={orientation === 'grid' ? 'horizontal' : orientation}
				>
					{children}
				</_Toolbar.Root>
			</Layout>
		)
	}
)

/** @public */
export interface TlToolbarButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	asChild?: boolean
	children?: React.ReactNode
	className?: string
	disabled?: boolean
	isActive?: boolean
	type: 'icon' | 'tool' | 'menu'
	tooltip?: string
}

/** @public @react */
export const TlToolbarButton = React.forwardRef<HTMLButtonElement, TlToolbarButtonProps>(
	({ asChild, children, type, isActive, tooltip, ...props }: TlToolbarButtonProps, ref) => {
		const button = (
			<_Toolbar.Button
				ref={ref}
				asChild={asChild}
				draggable={false}
				data-isactive={isActive}
				{...props}
				aria-label={props.title}
				title={undefined}
				className={classnames('tl-button', `tl-button--${type}`, props.className)}
			>
				{children}
			</_Toolbar.Button>
		)

		const tooltipContent = tooltip || props.title

		return <TlTooltip content={tooltipContent}>{button}</TlTooltip>
	}
)

/** @public */
export interface TlToolbarToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	value: any
	defaultValue?: any
	type: 'single' | 'multiple'
	asChild?: boolean
}

/** @public @react */
export function TlToolbarToggleGroup({
	children,
	className,
	type,
	asChild,
	...props
}: TlToolbarToggleGroupProps) {
	return (
		<_Toolbar.ToggleGroup
			asChild={asChild}
			type={type}
			{...props}
			role="radiogroup"
			className={classnames('tl-toolbar__toggle-group', className)}
		>
			{children}
		</_Toolbar.ToggleGroup>
	)
}

/** @public */
export interface TlToolbarToggleItemProps extends React.HTMLAttributes<HTMLButtonElement> {
	children?: React.ReactNode
	className?: string
	type: 'icon' | 'tool'
	value: string
	tooltip?: React.ReactNode
}

/** @public @react */
export function TlToolbarToggleItem({
	children,
	className,
	type,
	value,
	tooltip,
	...props
}: TlToolbarToggleItemProps) {
	const toggleItem = (
		<_Toolbar.ToggleItem
			{...props}
			title={undefined}
			className={classnames(
				'tl-button',
				`tl-button--${type}`,
				'tl-toolbar__toggle-item',
				className
			)}
			value={value}
		>
			{children}
		</_Toolbar.ToggleItem>
	)

	const tooltipContent = tooltip || props.title

	return <TlTooltip content={tooltipContent}>{toggleItem}</TlTooltip>
}
