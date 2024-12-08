import { ReactNode } from 'react'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import styles from './anon.module.css'

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	usePreventAccidentalDrops()

	return (
		<div className={styles.layout}>
			<div className={styles.editorWrapper}>{children}</div>
		</div>
	)
}
