import classnames from 'classnames'
import { Toolbar as _Toolbar } from 'radix-ui'
import React from 'react'
import { TldrawUiColumn, TldrawUiGrid, TldrawUiRow } from './layout'
import { TldrawUiTooltip } from './TldrawUiTooltip'

/** @public */
export interface TldrawUiToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	label: string
	orientation?: 'horizontal' | 'vertical' | 'grid'
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}

const LayoutByOrientation = {
	horizontal: TldrawUiRow,
	vertical: TldrawUiColumn,
	grid: TldrawUiGrid,
}

/** @public @react */
export const TldrawUiToolbar = React.forwardRef<HTMLDivElement, TldrawUiToolbarProps>(
	(
		{
			children,
			className,
			label,
			orientation = 'horizontal',
			tooltipSide,
			...props
		}: TldrawUiToolbarProps,
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
export interface TldrawUiToolbarButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	asChild?: boolean
	children?: React.ReactNode
	className?: string
	disabled?: boolean
	isActive?: boolean
	type: 'icon' | 'tool' | 'menu'
	tooltip?: string
}

/** @public @react */
export const TldrawUiToolbarButton = React.forwardRef<
	HTMLButtonElement,
	TldrawUiToolbarButtonProps
>(({ asChild, children, type, isActive, tooltip, ...props }: TldrawUiToolbarButtonProps, ref) => {
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

	return <TldrawUiTooltip content={tooltipContent}>{button}</TldrawUiTooltip>
})

/** @public */
export interface TldrawUiToolbarToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	value: any
	defaultValue?: any
	type: 'single' | 'multiple'
	asChild?: boolean
}

/** @public @react */
export function TldrawUiToolbarToggleGroup({
	children,
	className,
	type,
	asChild,
	...props
}: TldrawUiToolbarToggleGroupProps) {
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
export interface TldrawUiToolbarToggleItemProps extends React.HTMLAttributes<HTMLButtonElement> {
	children?: React.ReactNode
	className?: string
	type: 'icon' | 'tool'
	value: string
	tooltip?: React.ReactNode
}

/** @public @react */
export function TldrawUiToolbarToggleItem({
	children,
	className,
	type,
	value,
	tooltip,
	...props
}: TldrawUiToolbarToggleItemProps) {
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

	return <TldrawUiTooltip content={tooltipContent}>{toggleItem}</TldrawUiTooltip>
}
