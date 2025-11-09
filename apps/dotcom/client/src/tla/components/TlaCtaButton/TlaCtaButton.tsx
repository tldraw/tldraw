import classNames from 'classnames'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import styles from './cta-button.module.css'

export const TlaCtaButton = forwardRef<
	HTMLButtonElement,
	ButtonHTMLAttributes<HTMLButtonElement> & { canvas?: boolean }
>(function TlaCtaButton({ className, canvas = false, ...props }, ref) {
	return (
		<button
			ref={ref}
			type="button"
			draggable={false}
			className={classNames(
				'tla-primary-button',
				styles.ctaButton,
				{
					[styles.ctaButtonCanvas]: canvas,
				},
				className
			)}
			{...props}
		/>
	)
})
