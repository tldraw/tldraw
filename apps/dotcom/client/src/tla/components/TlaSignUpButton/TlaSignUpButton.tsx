import { SignInButton } from '@clerk/clerk-react'
import classNames from 'classnames'
import { forwardRef } from 'react'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'
import styles from './sign-up-button.module.css'

export const TlaSignUpButton = forwardRef<HTMLButtonElement>(function ShareButton(props, ref) {
	const trackEvent = useTldrawAppUiEvents()
	return (
		<SignInButton
			mode="modal"
			forceRedirectUrl={location.pathname + location.search}
			signUpForceRedirectUrl={location.pathname + location.search}
		>
			<button
				ref={ref}
				draggable={false}
				type="button"
				data-testId="tla-signup-button"
				className="tlui-share-zone__button-wrapper"
				{...props}
				onClick={() => trackEvent('sign-up-clicked', { source: 'anon-landing-page' })}
			>
				<div
					className={classNames(
						'tlui-button tlui-button__normal tlui-share-zone__button',
						styles.signUpButton
					)}
				>
					<span className="tlui-button__label" draggable={false}>
						<F defaultMessage="Sign in" />
					</span>
				</div>
			</button>
		</SignInButton>
	)
})
