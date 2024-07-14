import { ButtonHTMLAttributes } from 'react'
import { TlaIcon } from './TlaIcon'
import { TlaSpinner } from './TlaSpinner'

export function TlaButton({
	children,
	className = '',
	icon = '',
	iconRight = '',
	variant = 'primary',
	isLoading = false,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	isLoading?: boolean
	icon?: string
	iconRight?: string
	variant?: 'primary' | 'secondary' | 'warning'
}) {
	return (
		<button
			{...props}
			data-state={isLoading ? 'loading' : 'ready'}
			className={`tla-button tla-button__${variant} tla-text_ui__regular ${className}`}
		>
			{icon && <TlaIcon icon={icon} />}
			{children && <span>{children}</span>}
			{iconRight && <TlaIcon icon={iconRight} />}
			{isLoading && (
				<div className="tla-button_spinner">
					<TlaSpinner />
				</div>
			)}
		</button>
	)
}
