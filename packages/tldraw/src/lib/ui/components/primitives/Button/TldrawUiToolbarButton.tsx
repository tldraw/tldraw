import * as Toolbar from '@radix-ui/react-toolbar'
import classnames from 'classnames'
import { ReactNode } from 'react'

/** @public */
export interface TLUiToolbarButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	asChild?: boolean
	children?: ReactNode
	className?: string
	disabled?: boolean
	isActive?: boolean
	type: 'icon' | 'tool'
}

/** @public @react */
export const TldrawUiToolbarButton = ({
	asChild,
	children,
	type,
	isActive,
	...props
}: TLUiToolbarButtonProps) => {
	return (
		<Toolbar.Button
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
