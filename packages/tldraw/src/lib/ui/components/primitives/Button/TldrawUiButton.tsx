import classnames from 'classnames'
import * as React from 'react'

/** @public */
export interface TLUiButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	disabled?: boolean
	type: 'normal' | 'primary' | 'danger' | 'low' | 'icon' | 'tool' | 'menu' | 'help'
}

/** @public @react */
export const TldrawUiButton = React.forwardRef<HTMLButtonElement, TLUiButtonProps>(
	function TldrawUiButton({ children, disabled, type, ...props }, ref) {
		return (
			<button
				ref={ref}
				type="button"
				draggable={false}
				disabled={disabled}
				{...props}
				className={classnames('tlui-button', `tlui-button__${type}`, props.className)}
			>
				{children}
			</button>
		)
	}
)
