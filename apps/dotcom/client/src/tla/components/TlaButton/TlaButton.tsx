import classNames from 'classnames'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './button.module.css'

export const TlaButton = forwardRef<
	HTMLButtonElement,
	ButtonHTMLAttributes<HTMLButtonElement> & {
		isLoading?: boolean
		icon?: string
		iconRight?: string
		iconRightClassName?: string
		ghost?: boolean
		variant?: 'primary' | 'secondary' | 'warning' | 'cta'
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
		onClick,
		...props
	},
	ref
) {
	return (
		<button
			{...props}
			onClick={isLoading ? undefined : onClick}
			ref={ref}
			data-state={isLoading ? 'loading' : 'ready'}
			className={classNames(
				'tla-button',
				styles.tlaButton,
				{
					[styles.cta]: variant === 'cta',
					[styles.primary]: variant === 'primary',
					[styles.secondary]: variant === 'secondary',
					[styles.ghost]: ghost,
				},
				className
			)}
		>
			{isLoading && !iconRight ? (
				<div className={styles.spinner}>
					<TlaIcon className="tla-spinner" icon="spinner" />
				</div>
			) : (
				<>
					{icon && <TlaIcon icon={icon} />}
					{children && <span>{children}</span>}
					{iconRight &&
						(isLoading ? (
							<div className={classNames(styles.iconRight, iconRightClassName)}>
								<TlaIcon icon={iconRight} className={styles.spinner} />
							</div>
						) : (
							<TlaIcon
								icon={iconRight}
								className={classNames(styles.iconRight, iconRightClassName)}
							/>
						))}
				</>
			)}
		</button>
	)
})
