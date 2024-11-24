import { SignUpButton } from '@clerk/clerk-react'
import { ComponentProps } from 'react'
import { useLocation } from 'react-router-dom'
import { F } from '../../utils/i18n'
import { TlaButton } from '../TlaButton/TlaButton'

export function TlaSignUpButton({ children, ...props }: ComponentProps<typeof TlaButton>) {
	const location = useLocation()
	return (
		<SignUpButton
			mode="modal"
			forceRedirectUrl={location.pathname + location.search}
			signInForceRedirectUrl={location.pathname + location.search}
		>
			<TlaButton data-testid="tla-sign-up-button" {...props}>
				{children ?? <F defaultMessage="Sign up" />}
			</TlaButton>
		</SignUpButton>
	)
}
