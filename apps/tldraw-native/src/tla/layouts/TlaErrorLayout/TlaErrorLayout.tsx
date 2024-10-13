import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { TlaCloseButton } from '../../components/TlaCloseButton/TlaCloseButton'
import styles from './error-layout.module.css'

export function TlaErrorLayout({ children }: { children: ReactNode }) {
	const navigate = useNavigate()

	return (
		<div data-sidebar="false">
			<TlaCloseButton onClose={() => navigate('/')} />
			<div className={styles.page}>
				<div className={styles.pageCentered}>{children}</div>
			</div>
		</div>
	)
}
