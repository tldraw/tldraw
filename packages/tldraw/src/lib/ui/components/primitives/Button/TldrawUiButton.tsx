import { useEditor } from '@tldraw/editor'
import classnames from 'classnames'
import * as React from 'react'

/** @public */
export interface TLUiButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	disabled?: boolean
	type: 'normal' | 'primary' | 'danger' | 'low' | 'icon' | 'tool' | 'menu' | 'help'
}

/** @public */
export const TldrawUiButton = React.forwardRef<HTMLButtonElement, TLUiButtonProps>(
	function TldrawUiButton({ children, disabled, type, ...props }, ref) {
		const editor = useEditor()

		// If the button is getting disabled while it's focused, move focus to the editor
		// so that the user can continue using keyboard shortcuts
		const current = (ref as React.MutableRefObject<HTMLButtonElement | null>)?.current
		if (disabled && current === document.activeElement) {
			editor.getContainer().focus()
		}

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
