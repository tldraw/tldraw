import { ReactNode } from 'react'
import { AppStateProvider, useAppState } from '../hooks/useAppState'

export function TlaAppStateBoundary({ children }: { children: ReactNode }) {
	return (
		<AppStateProvider>
			<TlaAppInner>{children}</TlaAppInner>
		</AppStateProvider>
	)
}

function TlaAppInner({ children }: { children: ReactNode }) {
	const auth = useAppState()

	if (!auth.session) {
		window.location.href = '/auth'
	}

	return children
}
