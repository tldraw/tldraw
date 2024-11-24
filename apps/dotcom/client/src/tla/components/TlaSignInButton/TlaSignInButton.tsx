import { SignInButton } from '@clerk/clerk-react'
import { ComponentProps } from 'react'
import { useLocation } from 'react-router-dom'
import { F } from '../../utils/i18n'
import { TlaButton } from '../TlaButton/TlaButton'

export function TlaSignInButton({ children, ...props }: ComponentProps<typeof TlaButton>) {
	const location = useLocation()
	return (
		<SignInButton
			mode="modal"
			forceRedirectUrl={location.pathname + location.search}
			signUpForceRedirectUrl={location.pathname + location.search}
		>
			<TlaButton data-testid="tla-signin-button" {...props}>
				{children ?? <F defaultMessage="Sign in" />}
			</TlaButton>
		</SignInButton>
	)
}
