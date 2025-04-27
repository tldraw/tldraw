import classnames from 'classnames'
import { Toolbar } from 'radix-ui'
import React from 'react'

/** @public */
export interface TLUiToolbarProps extends React.HTMLAttributes {
	children?: React.ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	label: string
}

/** @public @react */
export const TldrawUiToolbar = React.forwardRef<HTMLDivElement, TLUiToolbarProps>(
	({ children, className, label, ...props }: TLUiToolbarProps, ref) => {
		return (
			<Toolbar.Root
				ref={ref}
				{...props}
				className={classnames('tlui-toolbar-container', className)}
				aria-label={label}
			>
				{children}
			</Toolbar.Root>
		)
	}
)

/** @public */
export interface TLUiToolbarButtonProps extends React.HTMLAttributes {
	asChild?: boolean
	children?: React.ReactNode
	className?: string
	disabled?: boolean
	isActive?: boolean
	type: 'icon' | 'tool' | 'menu'
}

/** @public @react */
export const TldrawUiToolbarButton = React.forwardRef<HTMLButtonElement, TLUiToolbarButtonProps>(
	({ asChild, children, type, isActive, ...props }: TLUiToolbarButtonProps, ref) => {
		return (
			<Toolbar.Button
				ref={ref}
				asChild={asChild}
				draggable={false}
				data-isactive={isActive}
				{...props}
				className={classnames('tlui-button', `tlui-button__${type}`, props.className)}
			>
				{children}
			</Toolbar.Button>
		)
	}
)

/** @public */
export interface TLUiToolbarToggleGroupProps extends React.HTMLAttributes {
	children?: React.ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	// TODO: fix up this type later
	defaultValue?: any
	type: 'single' | 'multiple'
}

/** @public @react */
export const TldrawUiToolbarToggleGroup = (
	{ children, className, type, ...props }: TLUiToolbarToggleGroupProps
) => {
	return (
		<Toolbar.ToggleGroup
			type={type}
			{...props}
			className={classnames('tlui-toolbar-toggle-group', className)}
		>
			{children}
		</Toolbar.ToggleGroup>
	)
}

/** @public */
export interface TLUiToolbarToggleItemProps extends React.HTMLAttributes {
	children?: React.ReactNode
	className?: string
	type: 'icon' | 'tool'
	value: string
}

/** @public @react */
export const TldrawUiToolbarToggleItem = (
	{ children, className, type, value, ...props }: TLUiToolbarToggleItemProps
) => {
	return (
		<Toolbar.ToggleItem
			{...props}
			className={classnames(
				'tlui-button',
				`tlui-button__${type}`,
				'tlui-toolbar-toggle-group-item',
				className
			)}
			value={value}
		>
			{children}
		</Toolbar.ToggleItem>
	)
}
