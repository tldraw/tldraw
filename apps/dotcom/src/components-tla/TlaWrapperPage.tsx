import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaCloseButton } from './TlaCloseButton'

export function TlaWrapperPage({ children }: { children: ReactNode }) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	const navigate = useNavigate()
	return (
		<div
			className={`${theme === 'light' ? 'tla_theme__light' : 'tla_theme__dark'} tla tla_layout tla_full`}
			data-sidebar="false"
		>
			<TlaCloseButton
				onClose={() => {
					navigate('/w')
				}}
			/>
			<div className="tla_page">{children}</div>
		</div>
	)
}
