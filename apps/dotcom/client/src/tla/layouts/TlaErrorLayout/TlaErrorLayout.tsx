import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaCloseButton } from '../../components/TlaCloseButton/TlaCloseButton'
import { useApp } from '../../hooks/useAppState'
import styles from './error-layout.module.css'

export function TlaErrorLayout({ children }: { children: ReactNode }) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	const navigate = useNavigate()

	return (
		<div
			className={`tla tl-container ${theme === 'light' ? 'tla-theme__light' : 'tla-theme__dark'} `}
			data-sidebar="false"
		>
			<TlaCloseButton onClose={() => navigate('/q/')} />
			<div className={styles.page}>{children}</div>
		</div>
	)
}
