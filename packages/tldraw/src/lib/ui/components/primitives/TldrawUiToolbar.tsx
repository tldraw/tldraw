import * as Toolbar from '@radix-ui/react-toolbar'
import classnames from 'classnames'
import { forwardRef, ReactNode } from 'react'

/** @public */
export interface TLUiToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: ReactNode
	className?: string
	dir?: 'ltr' | 'rtl'
	label: string
}

/** @public @react */
export const TldrawUiToolbar = forwardRef<HTMLDivElement, TLUiToolbarProps>(
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
export interface TLUiToolbarButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	asChild?: boolean
	children?: ReactNode
	className?: string
	disabled?: boolean
	isActive?: boolean
	type: 'icon' | 'tool' | 'menu'
}

/** @public @react */
export const TldrawUiToolbarButton = forwardRef<HTMLButtonElement, TLUiToolbarButtonProps>(
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
export interface TLUiToolbarToggleGroupProps {
	children?: ReactNode
	className?: string
	type: 'single' | 'multiple'
}

/** @public @react */
export const TldrawUiToolbarToggleGroup = ({
	children,
	className,
	type,
}: TLUiToolbarToggleGroupProps) => {
	return (
		<Toolbar.ToggleGroup type={type} className={classnames('tlui-toolbar-toggle-group', className)}>
			{children}
		</Toolbar.ToggleGroup>
	)
}

/** @public */
export interface TLUiToolbarToggleItemProps extends React.HTMLAttributes<HTMLButtonElement> {
	children?: ReactNode
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
