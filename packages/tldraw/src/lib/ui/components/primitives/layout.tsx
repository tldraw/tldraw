import classNames from 'classnames'
import { Slot } from 'radix-ui'
import { HTMLAttributes, ReactNode, forwardRef } from 'react'

/** @public */
export interface TLUiLayoutProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
	asChild?: boolean
}

/** @public @react */
export const TldrawUiRow = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ asChild, className, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return <Component ref={ref} className={classNames('tlui-row', className)} {...props} />
	}
)

/** @public @react */
export const TldrawUiColumn = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ asChild, className, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return <Component ref={ref} className={classNames('tlui-column', className)} {...props} />
	}
)

/** @public @react */
export const TldrawUiGrid = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ asChild, className, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return <Component ref={ref} className={classNames('tlui-grid', className)} {...props} />
	}
)
