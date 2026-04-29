import classnames from 'classnames'
import * as React from 'react'
import { TldrawUiTooltip } from '../TldrawUiTooltip'

/** @public */
export interface TLUiButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	disabled?: boolean
	isActive?: boolean
	type: 'normal' | 'primary' | 'danger' | 'low' | 'icon' | 'tool' | 'menu' | 'help'
	htmlButtonType?: 'button' | 'submit' | 'reset'
	tooltip?: string
}

const namedClassNamesSoThatICanGrepForThis = {
	normal: 'tlui-button__normal',
	primary: 'tlui-button__primary',
	danger: 'tlui-button__danger',
	low: 'tlui-button__low',
	icon: 'tlui-button__icon',
	tool: 'tlui-button__tool',
	menu: 'tlui-button__menu',
	help: 'tlui-button__help',
}

/** @public @react */
export const TldrawUiButton = React.forwardRef<HTMLButtonElement, TLUiButtonProps>(
	function TldrawUiButton({ children, type, htmlButtonType, isActive, tooltip, ...props }, ref) {
		const button = (
			<button
				ref={ref}
				type={htmlButtonType || 'button'}
				draggable={false}
				data-isactive={isActive}
				{...props}
				className={classnames(
					'tlui-button',
					namedClassNamesSoThatICanGrepForThis[type],
					props.className
				)}
				aria-label={props['aria-label'] ?? props.title}
				// The tooltip takes care of this.
				title={tooltip ? undefined : props.title}
			>
				{children}
			</button>
		)

		if (tooltip) {
			return <TldrawUiTooltip content={tooltip}>{button}</TldrawUiTooltip>
		}

		return button
	}
)
