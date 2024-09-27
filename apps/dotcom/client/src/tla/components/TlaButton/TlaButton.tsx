import classNames from 'classnames'
import { ButtonHTMLAttributes } from 'react'
import { TlaIcon } from '../TlaIcon'
import { TlaSpinner } from '../TlaSpinner'
import styles from './button.module.css'

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
			className={classNames(
				'tla-text_ui__medium',
				styles.button,
				{
					[styles.primary]: variant === 'primary',
					[styles.secondary]: variant === 'secondary',
				},
				className
			)}
		>
			{icon && <TlaIcon icon={icon} />}
			{children && <span>{children}</span>}
			{iconRight && <TlaIcon icon={iconRight} />}
			{isLoading && (
				<div className={styles.spinner}>
					<TlaSpinner />
				</div>
			)}
		</button>
	)
}
