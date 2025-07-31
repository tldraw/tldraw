import classNames from 'classnames'
import { Slot } from 'radix-ui'
import { HTMLAttributes, ReactNode } from 'react'

/** @public */
export interface TLUiLayoutProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
	asChild?: boolean
}

/** @public @react */
export function TldrawUiRow({ asChild, className, ...props }: TLUiLayoutProps) {
	const Component = asChild ? Slot.Root : 'div'
	return <Component className={classNames('tlui-row', className)} {...props} />
}

/** @public @react */
export function TldrawUiGrid({ asChild, className, ...props }: TLUiLayoutProps) {
	const Component = asChild ? Slot.Root : 'div'
	return <Component className={classNames('tlui-grid', className)} {...props} />
}
