import { Toggle as _Toggle } from '@base-ui/react/toggle'
import { ToggleGroup as _ToggleGroup } from '@base-ui/react/toggle-group'
import { Toolbar as _Toolbar } from '@base-ui/react/toolbar'
import classnames from 'classnames'
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
				render={asChild ? (children as React.ReactElement) : undefined}
				draggable={false}
				data-isactive={isActive}
				{...props}
				aria-label={props.title}
				// The tooltip takes care of this.
				title={undefined}
				className={classnames('tlui-button', `tlui-button__${type}`, props.className)}
			>
				{asChild ? undefined : children}
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

// Base UI's ToggleGroup always represents its value as an array, where Radix used a plain
// string for `type="single"` groups.
function toToggleGroupValue(value: any): string[] | undefined {
	if (value === undefined) return undefined
	if (value === null) return []
	return Array.isArray(value) ? value : [value]
}

/** @public @react */
export function TldrawUiToolbarToggleGroup({
	children,
	className,
	type,
	asChild,
	value,
	defaultValue,
	...props
}: TLUiToolbarToggleGroupProps) {
	return (
		<_ToggleGroup
			render={asChild ? (children as React.ReactElement) : undefined}
			multiple={type === 'multiple'}
			value={toToggleGroupValue(value)}
			defaultValue={toToggleGroupValue(defaultValue)}
			{...props}
			className={classnames('tlui-toolbar-toggle-group', className)}
		>
			{asChild ? undefined : children}
		</_ToggleGroup>
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
export function TldrawUiToolbarToggleItem({
	children,
	className,
	type,
	value,
	tooltip,
	...props
}: TLUiToolbarToggleItemProps) {
	const toggleItem = (
		<_Toolbar.Button
			render={<_Toggle value={value} />}
			{...props}
			// The tooltip takes care of this.
			title={undefined}
			className={classnames(
				'tlui-button',
				`tlui-button__${type}`,
				'tlui-toolbar-toggle-group-item',
				className
			)}
		>
			{children}
		</_Toolbar.Button>
	)

	const tooltipContent = tooltip || props.title

	return <TldrawUiTooltip content={tooltipContent}>{toggleItem}</TldrawUiTooltip>
}
