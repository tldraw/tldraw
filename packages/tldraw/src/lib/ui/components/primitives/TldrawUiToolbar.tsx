import * as Toolbar from '@radix-ui/react-toolbar'
import classnames from 'classnames'
import { ReactNode } from 'react'

/** @public */
export interface TLUiToolbarProps {
	children?: ReactNode
	className?: string
	label: string
}

/** @public @react */
export const TldrawUiToolbar = ({ children, className, label }: TLUiToolbarProps) => {
	return (
		<Toolbar.Root
			role="toolbar"
			className={classnames('tlui-toolbar-container', className)}
			aria-label={label}
		>
			{children}
		</Toolbar.Root>
	)
}
