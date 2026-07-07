import classnames from 'classnames'
import * as React from 'react'
import { useTlTranslation } from '../context/translation'
import { TlIcon, TlIconJsx } from './TlIcon'
import { TlSpinner } from './TlSpinner'
import { TlTooltip } from './TlTooltip'

/** @public */
export type TlButtonType =
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
export interface TlButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
	disabled?: boolean
	isActive?: boolean
	type: TlButtonType
	htmlButtonType?: 'button' | 'submit' | 'reset'
	tooltip?: string
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}

const typeClassNames: Record<TlButtonType, string> = {
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
export const TlButton = React.forwardRef<HTMLButtonElement, TlButtonProps>(function TlButton(
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
			<TlTooltip content={tooltip} side={tooltipSide}>
				{button}
			</TlTooltip>
		)
	}

	return button
})

/** @public */
export interface TlButtonIconProps {
	icon: string | TlIconJsx
	small?: boolean
	invertIcon?: boolean
}

/** @public @react */
export function TlButtonIcon({ icon, small, invertIcon }: TlButtonIconProps) {
	return (
		<TlIcon
			aria-hidden="true"
			className="tl-button__icon"
			icon={icon}
			small={small}
			style={invertIcon ? { transform: 'scale(-1, 1)' } : undefined}
		/>
	)
}

/** @public */
export interface TlButtonLabelProps {
	children?: React.ReactNode
}

/** @public @react */
export function TlButtonLabel({ children }: TlButtonLabelProps) {
	return <span className="tl-button__label">{children}</span>
}

/** @public */
export interface TlButtonCheckProps {
	checked: boolean
}

/** @public @react */
export function TlButtonCheck({ checked }: TlButtonCheckProps) {
	const { msg } = useTlTranslation()

	return (
		<TlIcon
			data-checked={!!checked}
			label={msg(checked ? 'ui.checked' : 'ui.unchecked', checked ? 'Checked' : 'Unchecked')}
			icon={checked ? 'check' : 'none'}
			className="tl-button__icon"
			small
		/>
	)
}

/** @public @react */
export function TlButtonSpinner() {
	return <TlSpinner className="tl-button__spinner" />
}
