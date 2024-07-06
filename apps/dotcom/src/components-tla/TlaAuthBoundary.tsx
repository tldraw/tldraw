import { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { AuthPage } from '../pages/auth'

export function TlaAuthBoundary({ children }: { children: ReactNode }) {
	return (
		<div className="tla">
			<AuthProvider>
				<TlaAuthInner>{children}</TlaAuthInner>
			</AuthProvider>
		</div>
	)
}

function TlaAuthInner({ children }: { children: ReactNode }) {
	const auth = useAuth()

	if (!auth.user) {
		return (
			<AuthPage
				onClose={() => {
					window.location.href = '/'
				}}
			/>
		)
	}

	return children
}
