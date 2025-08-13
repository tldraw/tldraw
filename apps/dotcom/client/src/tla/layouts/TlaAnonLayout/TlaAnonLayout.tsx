import { ReactNode } from 'react'
import { TlaCookieConsent } from '../../components/dialogs/TlaCookieConsent'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import styles from './anon.module.css'

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	usePreventAccidentalDrops()

	return (
		<div className={styles.anonLayout}>
			<div className={styles.anonEditorWrapper}>{children}</div>
			<TlaCookieConsent />
		</div>
	)
}
