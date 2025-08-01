import classNames from 'classnames'
import { Slot } from 'radix-ui'
import { HTMLAttributes, ReactNode } from 'react'

/** @public */
export interface TLUiLayoutProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
	asChild?: boolean
}

/**
 * A row, usually of UI controls like buttons, select dropdown, checkboxes, etc.
 *
 * @public @react
 */
export function TldrawUiRow({ asChild, className, ...props }: TLUiLayoutProps) {
	const Component = asChild ? Slot.Root : 'div'
	return <Component className={classNames('tlui-row', className)} {...props} />
}

/**
 * A tight grid 4 elements wide, usually of UI controls like buttons, select dropdown, checkboxes,
 * etc.
 *
 * @public @react */
export function TldrawUiGrid({ asChild, className, ...props }: TLUiLayoutProps) {
	const Component = asChild ? Slot.Root : 'div'
	return <Component className={classNames('tlui-grid', className)} {...props} />
}
