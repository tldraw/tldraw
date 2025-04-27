import classnames from 'classnames'
import * as React from 'react'

/** @public */
export interface TLUiButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	disabled?: boolean
	isActive?: boolean
	type: 'normal' | 'primary' | 'danger' | 'low' | 'icon' | 'tool' | 'menu' | 'help'
}

/** @public @react */
export const TldrawUiButton = React.forwardRef<HTMLButtonElement, TLUiButtonProps>(
	function TldrawUiButton({ children, type, isActive, ...props }, ref) {
		return (
			<button
				ref={ref}
				type="button"
				draggable={false}
				data-isactive={isActive}
				{...props}
				className={classnames('tlui-button', `tlui-button__${type}`, props.className)}
			>
				{children}
			</button>
		)
	}
)
