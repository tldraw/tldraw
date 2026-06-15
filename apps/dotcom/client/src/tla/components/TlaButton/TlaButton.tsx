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
		/** Adds a background-coloured ring so a `cta` button reads correctly floating over canvas content. */
		canvas?: boolean
		/** Renders a `cta` button with the muted secondary treatment instead of the filled call-to-action colour. */
		ctaSecondary?: boolean
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
		canvas = false,
		ctaSecondary = false,
		type,
		draggable,
		onClick,
		...props
	},
	ref
) {
	const isCta = variant === 'cta'
	return (
		<button
			{...props}
			// cta buttons default to type="button" and draggable={false}, matching the
			// behaviour of the former TlaCtaButton; callers can still override either.
			type={type ?? (isCta ? 'button' : undefined)}
			draggable={draggable ?? (isCta ? false : undefined)}
			onClick={isLoading ? undefined : onClick}
			ref={ref}
			data-state={isLoading ? 'loading' : 'ready'}
			className={classNames(
				'tla-button',
				styles.tlaButton,
				{
					[styles.cta]: isCta,
					[styles.ctaCanvas]: isCta && canvas,
					[styles.ctaSecondary]: isCta && ctaSecondary,
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
