import classNames from 'classnames'
import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaCloseButton } from '../../components/TlaCloseButton/TlaCloseButton'
import { useApp } from '../../hooks/useAppState'
import styles from './page.module.css'

export function TlaPageLayout({ children }: { children: ReactNode }) {
	const app = useApp()

	const theme = useValue('theme', () => app.getSessionState().theme, [app])

	const navigate = useNavigate()

	const handleCloseClick = useCallback(() => {
		navigate(-1)
	}, [navigate])

	return (
		<div
			className={classNames(
				`tla tl-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`,
				styles.container
			)}
		>
			<TlaCloseButton onClose={handleCloseClick} />
			<div className={styles.page}>{children}</div>
		</div>
	)
}
