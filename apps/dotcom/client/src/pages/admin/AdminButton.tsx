import React from 'react'
import styles from './admin.module.css'

export function AdminButton({
	variant = 'secondary',
	isLoading,
	className,
	children,
	disabled,
	...rest
}: {
	variant?: 'primary' | 'secondary' | 'danger'
	isLoading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const variantClass =
		variant === 'primary'
			? styles.btnPrimary
			: variant === 'danger'
				? styles.btnDanger
				: styles.btnSecondary
	return (
		<button
			{...rest}
			disabled={disabled || isLoading}
			className={[styles.btn, variantClass, className].filter(Boolean).join(' ')}
		>
			{isLoading ? '…' : children}
		</button>
	)
}
