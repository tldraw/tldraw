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
	variant?: 'primary' | 'secondary'
}) {
	return (
		<button
			{...props}
			data-state={isLoading ? 'loading' : 'ready'}
			className={`tla_button tla_button__${variant} tla_text_ui__regular ${className}`}
		>
			{icon && <TlaIcon icon={icon} />}
			{children && <span>{children}</span>}
			{iconRight && <TlaIcon icon={iconRight} />}
			{isLoading && (
				<div className="tla_button_spinner">
					<TlaSpinner />
				</div>
			)}
		</button>
	)
}
