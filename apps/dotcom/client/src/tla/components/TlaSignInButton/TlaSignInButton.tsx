import { SignInButton } from '@clerk/clerk-react'
import { ComponentProps } from 'react'
import { useLocation } from 'react-router-dom'
import { useRaw } from '../../hooks/useRaw'
import { TlaButton } from '../TlaButton/TlaButton'

export function TlaSignInButton({ children, ...props }: ComponentProps<typeof TlaButton>) {
	const raw = useRaw()
	const location = useLocation()
	return (
		<SignInButton
			mode="modal"
			forceRedirectUrl={location.pathname + location.search}
			signUpForceRedirectUrl={location.pathname + location.search}
		>
			<TlaButton {...props}>{children ?? raw('Sign in')}</TlaButton>
		</SignInButton>
	)
}
