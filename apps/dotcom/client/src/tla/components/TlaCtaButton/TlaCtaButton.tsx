import classNames from 'classnames'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import styles from './cta-button.module.css'

export const TlaCtaButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
	function TlaCtaButton(props, ref) {
		return (
			<button
				ref={ref}
				type="button"
				draggable={false}
				className={classNames('tla-primary-button', styles.ctaButton)}
				{...props}
			/>
		)
	}
)
