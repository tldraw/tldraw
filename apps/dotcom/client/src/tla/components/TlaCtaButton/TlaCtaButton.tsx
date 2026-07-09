import { TlButton } from '@tldraw/ui'
import classNames from 'classnames'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import styles from './cta-button.module.css'

export const TlaCtaButton = forwardRef<
	HTMLButtonElement,
	Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
		type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
		canvas?: boolean
		secondary?: boolean
	}
>(function TlaCtaButton({ className, canvas = false, secondary = false, type, ...props }, ref) {
	return (
		<TlButton
			ref={ref}
			type="cta"
			htmlButtonType={type ?? 'button'}
			className={classNames(
				'tla-primary-button',
				styles.ctaButton,
				{
					[styles.ctaButtonCanvas]: canvas,
					[styles.ctaButtonSecondary]: secondary,
				},
				className
			)}
			{...props}
		/>
	)
})
