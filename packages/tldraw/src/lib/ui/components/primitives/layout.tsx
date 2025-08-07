import classNames from 'classnames'
import { Slot } from 'radix-ui'
import { HTMLAttributes, ReactNode, forwardRef } from 'react'

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
export const TldrawUiRow = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ asChild, className, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return <Component ref={ref} className={classNames('tlui-row', className)} {...props} />
	}
)

/**
 * A tight grid 4 elements wide, usually of UI controls like buttons, select dropdown, checkboxes,
 * etc.
 *
 * @public @react */
export const TldrawUiGrid = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ asChild, className, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return <Component ref={ref} className={classNames('tlui-grid', className)} {...props} />
	}
)
