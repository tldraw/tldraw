import { TlButton, TlButtonIcon, TlButtonLabel, TlButtonSpinner, TlIcon } from '@tldraw/ui'
import classNames from 'classnames'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import styles from './button.module.css'

export const TlaButton = forwardRef<
	HTMLButtonElement,
	Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
		type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
		isLoading?: boolean
		icon?: string
		iconRight?: string
		iconRightClassName?: string
		ghost?: boolean
		big?: boolean
		variant?: 'primary' | 'secondary' | 'cta'
	}
>(function TlaButton(
	{
		children,
		className = '',
		icon = '',
		iconRight = '',
		iconRightClassName = '',
		ghost = false,
		variant = 'primary',
		isLoading = false,
		big = false,
		onClick,
		type,
		...props
	},
	ref
) {
	const buttonType = ghost ? 'ghost' : variant
	const hasIconRight = !!iconRight

	return (
		<TlButton
			{...props}
			type={buttonType}
			htmlButtonType={type ?? 'button'}
			onClick={isLoading ? undefined : onClick}
			ref={ref}
			data-state={isLoading ? 'loading' : 'ready'}
			data-has-icon-right={hasIconRight}
			className={classNames(
				'tla-button',
				variant !== 'cta' && 'tl-copy-button',
				ghost && variant === 'primary' && 'tl-button--primary',
				ghost && variant === 'secondary' && 'tl-button--secondary',
				styles.tlaButton,
				{
					[styles.big]: big,
				},
				className
			)}
		>
			{isLoading && !iconRight ? (
				<div className={styles.spinner}>
					<TlButtonSpinner />
				</div>
			) : (
				<>
					{icon && <TlButtonIcon icon={icon} small />}
					{children && <TlButtonLabel>{children}</TlButtonLabel>}
					{iconRight &&
						(isLoading ? (
							<div className={classNames(styles.iconRight, iconRightClassName)}>
								<TlButtonSpinner />
							</div>
						) : (
							<TlIcon
								icon={iconRight}
								small
								className={classNames('tl-button__icon', styles.iconRight, iconRightClassName)}
							/>
						))}
				</>
			)}
		</TlButton>
	)
})
