import classNames from 'classnames'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import styles from './cta-button.module.css'

export const TlaCtaButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
	function ShareButton(props, ref) {
		const trackEvent = useTldrawAppUiEvents()
		return (
			<button
				ref={ref}
				type="button"
				draggable={false}
				className={classNames(styles.ctaButton)}
				onClick={() => trackEvent('open-share-menu', { source: 'anon-landing-page' })}
				{...props}
			/>
		)
	}
)
