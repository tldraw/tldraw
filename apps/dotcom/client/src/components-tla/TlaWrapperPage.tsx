import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaCloseButton } from './TlaCloseButton'

export function TlaWrapperPage({ children }: { children: ReactNode }) {
	const app = useApp()

	const theme = useValue('theme', () => app.getSessionState().theme, [app])

	const navigate = useNavigate()

	const handleCloseClick = useCallback(() => {
		navigate(-1)
	}, [navigate])

	return (
		<div
			className={`${theme === 'light' ? 'tla-theme__light' : 'tla-theme__dark'} tla tla-layout`}
			data-sidebar="false"
		>
			<TlaCloseButton onClose={handleCloseClick} />
			<div className="tla-content tla-page">
				<div className="tla-page__prose">{children}</div>
			</div>
		</div>
	)
}
