import classnames from 'classnames'
import { Toolbar as _Toolbar } from 'radix-ui'
import React from 'react'

/** @public */
export interface TLUiToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	label: string
}

/** @public @react */
export const TldrawUiToolbar = React.forwardRef<HTMLDivElement, TLUiToolbarProps>(
	({ children, className, label, ...props }: TLUiToolbarProps, ref) => {
		return (
			<_Toolbar.Root
				ref={ref}
				{...props}
				className={classnames('tlui-toolbar-container', className)}
				aria-label={label}
			>
				{children}
			</_Toolbar.Root>
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
}

/** @public @react */
export const TldrawUiToolbarButton = React.forwardRef<HTMLButtonElement, TLUiToolbarButtonProps>(
	({ asChild, children, type, isActive, ...props }: TLUiToolbarButtonProps, ref) => {
		return (
			<_Toolbar.Button
				ref={ref}
				asChild={asChild}
				draggable={false}
				data-isactive={isActive}
				{...props}
				className={classnames('tlui-button', `tlui-button__${type}`, props.className)}
			>
				{children}
			</_Toolbar.Button>
		)
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
}

/** @public @react */
export const TldrawUiToolbarToggleGroup = ({
	children,
	className,
	type,
	...props
}: TLUiToolbarToggleGroupProps) => {
	return (
		<_Toolbar.ToggleGroup
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
}

/** @public @react */
export const TldrawUiToolbarToggleItem = ({
	children,
	className,
	type,
	value,
	...props
}: TLUiToolbarToggleItemProps) => {
	return (
		<_Toolbar.ToggleItem
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
		</_Toolbar.ToggleItem>
	)
}
