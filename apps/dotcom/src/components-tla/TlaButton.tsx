import { ButtonHTMLAttributes } from 'react'
import { TlaSpinner } from './TlaSpinner'

export function TlaButton({
	children,
	className = '',
	variant = 'primary',
	isLoading = false,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	isLoading?: boolean
	variant?: 'primary' | 'secondary'
}) {
	return (
		<button
			{...props}
			data-state={isLoading ? 'loading' : 'ready'}
			className={`tla_button tla_button__${variant} tla_text_ui__regular ${className}`}
		>
			<span>{children}</span>
			{isLoading && (
				<div className="tla_button_spinner">
					<TlaSpinner />
				</div>
			)}
		</button>
	)
}
