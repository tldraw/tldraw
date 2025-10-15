import classnames from 'classnames'
import { Toolbar as _Toolbar } from 'radix-ui'
import React from 'react'
import { TldrawUiColumn, TldrawUiGrid, TldrawUiRow } from './layout'
import { TldrawUiTooltip } from './TldrawUiTooltip'

/** @public */
export interface TLUiToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
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
export const TldrawUiToolbar = React.forwardRef<HTMLDivElement, TLUiToolbarProps>(
	(
		{
			children,
			className,
			label,
			orientation = 'horizontal',
			tooltipSide,
			...props
		}: TLUiToolbarProps,
		ref
	) => {
		const Layout = LayoutByOrientation[orientation]
		return (
			<Layout asChild tooltipSide={tooltipSide}>
				<_Toolbar.Root
					ref={ref}
					{...props}
					className={classnames('tlui-toolbar', className)}
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
export interface TLUiToolbarButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	asChild?: boolean
	children?: React.ReactNode
	className?: string
	disabled?: boolean
	isActive?: boolean
	type: 'icon' | 'tool' | 'menu'
	tooltip?: string
}

/** @public @react */
export const TldrawUiToolbarButton = React.forwardRef<HTMLButtonElement, TLUiToolbarButtonProps>(
	({ asChild, children, type, isActive, tooltip, ...props }: TLUiToolbarButtonProps, ref) => {
		const button = (
			<_Toolbar.Button
				ref={ref}
				asChild={asChild}
				draggable={false}
				data-isactive={isActive}
				{...props}
				aria-label={props.title}
				// The tooltip takes care of this.
				title={undefined}
				className={classnames('tlui-button', `tlui-button__${type}`, props.className)}
			>
				{children}
			</_Toolbar.Button>
		)

		const tooltipContent = tooltip || props.title

		return <TldrawUiTooltip content={tooltipContent}>{button}</TldrawUiTooltip>
	}
)

/** @public */
export interface TLUiToolbarToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	value: any
	// TODO: fix up this type later
	defaultValue?: any
	type: 'single' | 'multiple'
	asChild?: boolean
}

/** @public @react */
export const TldrawUiToolbarToggleGroup = ({
	children,
	className,
	type,
	asChild,
	...props
}: TLUiToolbarToggleGroupProps) => {
	return (
		<_Toolbar.ToggleGroup
			asChild={asChild}
			type={type}
			{...props}
			// TODO: this fixes a bug in Radix until they fix it.
			// https://github.com/radix-ui/primitives/issues/3188
			// https://github.com/radix-ui/primitives/pull/3189
			role="radiogroup"
			className={classnames('tlui-toolbar-toggle-group', className)}
		>
			{children}
		</_Toolbar.ToggleGroup>
	)
}

/** @public */
export interface TLUiToolbarToggleItemProps extends React.HTMLAttributes<HTMLButtonElement> {
	children?: React.ReactNode
	className?: string
	type: 'icon' | 'tool'
	value: string
	tooltip?: React.ReactNode
}

/** @public @react */
export const TldrawUiToolbarToggleItem = ({
	children,
	className,
	type,
	value,
	tooltip,
	...props
}: TLUiToolbarToggleItemProps) => {
	const toggleItem = (
		<_Toolbar.ToggleItem
			{...props}
			// The tooltip takes care of this.
			title={undefined}
			className={classnames(
				'tlui-button',
				`tlui-button__${type}`,
				'tlui-toolbar-toggle-group-item',
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
