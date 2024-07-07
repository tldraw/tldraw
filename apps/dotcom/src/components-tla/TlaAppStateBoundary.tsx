import { ReactNode } from 'react'
import { AppStateProvider, useAppState } from '../hooks/useAppState'
import { AuthPage } from '../pages/auth'

export function TlaAppStateBoundary({ children }: { children: ReactNode }) {
	return (
		<div className="tla">
			<AppStateProvider>
				<TlaAppInner>{children}</TlaAppInner>
			</AppStateProvider>
		</div>
	)
}

function TlaAppInner({ children }: { children: ReactNode }) {
	const auth = useAppState()

	if (!auth.session) {
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
