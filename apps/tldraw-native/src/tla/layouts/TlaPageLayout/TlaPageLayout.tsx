import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TlaCloseButton } from '../../components/TlaCloseButton/TlaCloseButton'
import styles from './page.module.css'

export function TlaPageLayout({ children }: { children: ReactNode }) {
	const navigate = useNavigate()

	const handleCloseClick = useCallback(() => {
		navigate(-1)
	}, [navigate])

	return (
		<div className={styles.container}>
			<TlaCloseButton onClose={handleCloseClick} />
			<div className={styles.page}>{children}</div>
		</div>
	)
}
