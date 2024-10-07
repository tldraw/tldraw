import { ReactNode } from 'react'
import { useMaybeApp } from '../../hooks/useAppState'

export function TlaAppBoundary({ children }: { children: ReactNode }) {
	const app = useMaybeApp()
	if (!app) {
		return null
	}

	return children
}
