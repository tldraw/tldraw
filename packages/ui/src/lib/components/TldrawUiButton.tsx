import classnames from 'classnames'
import * as React from 'react'
import { useTldrawUiTranslation } from '../context/translation'
import { TldrawUiIcon, TldrawUiIconJsx } from './TldrawUiIcon'
import { TldrawUiSpinner } from './TldrawUiSpinner'
import { TldrawUiTooltip } from './TldrawUiTooltip'

/** @public */
export type TldrawUiButtonType =
	| 'normal'
	| 'primary'
	| 'danger'
	| 'low'
	| 'icon'
	| 'tool'
	| 'menu'
	| 'help'
	| 'secondary'
	| 'cta'
	| 'ghost'

/** @public */
export interface TldrawUiButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	disabled?: boolean
	isActive?: boolean
	type: TldrawUiButtonType
	htmlButtonType?: 'button' | 'submit' | 'reset'
	tooltip?: string
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}

const typeClassNames: Record<TldrawUiButtonType, string> = {
	normal: 'tl-button--normal',
	primary: 'tl-button--primary',
	danger: 'tl-button--danger',
	low: 'tl-button--low',
	icon: 'tl-button--icon',
	tool: 'tl-button--tool',
	menu: 'tl-button--menu',
	help: 'tl-button--help',
	secondary: 'tl-button--secondary',
	cta: 'tl-button--cta',
	ghost: 'tl-button--ghost',
}

/** @public @react */
export const TldrawUiButton = React.forwardRef<HTMLButtonElement, TldrawUiButtonProps>(
	function TldrawUiButton(
		{ children, type, htmlButtonType, isActive, tooltip, tooltipSide, ...props },
		ref
	) {
		const button = (
			<button
				ref={ref}
				type={htmlButtonType || 'button'}
				draggable={false}
				data-isactive={isActive}
				{...props}
				className={classnames('tl-button', typeClassNames[type], props.className)}
				aria-label={props['aria-label'] ?? props.title}
				title={tooltip ? undefined : props.title}
			>
				{children}
			</button>
		)

		if (tooltip) {
			return (
				<TldrawUiTooltip content={tooltip} side={tooltipSide}>
					{button}
				</TldrawUiTooltip>
			)
		}

		return button
	}
)

/** @public */
export interface TldrawUiButtonIconProps {
	icon: string | TldrawUiIconJsx
	small?: boolean
	invertIcon?: boolean
}

/** @public @react */
export function TldrawUiButtonIcon({ icon, small, invertIcon }: TldrawUiButtonIconProps) {
	return (
		<TldrawUiIcon
			aria-hidden="true"
			className="tl-button__icon"
			icon={icon}
			small={small}
			style={invertIcon ? { transform: 'scale(-1, 1)' } : undefined}
		/>
	)
}

/** @public */
export interface TldrawUiButtonLabelProps {
	children?: React.ReactNode
}

/** @public @react */
export function TldrawUiButtonLabel({ children }: TldrawUiButtonLabelProps) {
	return <span className="tl-button__label">{children}</span>
}

/** @public */
export interface TldrawUiButtonCheckProps {
	checked: boolean
}

/** @public @react */
export function TldrawUiButtonCheck({ checked }: TldrawUiButtonCheckProps) {
	const { msg } = useTldrawUiTranslation()

	return (
		<TldrawUiIcon
			data-checked={!!checked}
			label={msg(checked ? 'ui.checked' : 'ui.unchecked', checked ? 'Checked' : 'Unchecked')}
			icon={checked ? 'check' : 'none'}
			className="tl-button__icon"
			small
		/>
	)
}

/** @public @react */
export function TldrawUiButtonSpinner() {
	return <TldrawUiSpinner className="tl-button__spinner" />
}
