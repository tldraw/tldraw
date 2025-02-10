import { memo, useCallback } from 'react'
import { useDialogs, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { F } from '../../../utils/i18n'
import { TlaManageCookiesDialog } from '../../dialogs/TlaManageCookiesDialog'
import styles from '../sidebar.module.css'

export const TlaSidebarCookieConsent = memo(function TlaSidebarCookieConsent() {
	const app = useApp()
	const { addDialog } = useDialogs()

	const user = useValue('user id', () => app.getUser(), [app])

	const handleAccept = useCallback(() => {
		app.updateUser({ id: user.id, allowAnalyticsCookie: true })
	}, [app, user.id])

	const handleReject = useCallback(() => {
		app.updateUser({ id: user.id, allowAnalyticsCookie: false })
	}, [app, user.id])

	const handleCustomize = useCallback(() => {
		addDialog({ component: () => <TlaManageCookiesDialog /> })
	}, [addDialog])

	if (user.allowAnalyticsCookie !== null) return null

	return (
		<div className={styles.cookieConsent}>
			<p className={styles.cookieText}>
				<F
					defaultMessage="We use first-party cookies to improve our services. <a>Learn more</a>"
					values={{
						a: (chunks) => (
							<a href="https://tldraw.notion.site/cookie-policy" target="_blank" rel="noreferrer">
								{chunks}
							</a>
						),
					}}
				/>
			</p>
			<div className={styles.cookieButtons}>
				<button className={styles.cookieButton} onClick={handleCustomize}>
					<F defaultMessage="Privacy settings" />
				</button>
				<div className={styles.cookieActions}>
					<button className={styles.cookieButton} onClick={handleReject}>
						<F defaultMessage="Opt out" />
					</button>
					<button
						className={`${styles.cookieButton} ${styles.acceptButton}`}
						onClick={handleAccept}
					>
						<F defaultMessage="Accept" />
					</button>
				</div>
			</div>
		</div>
	)
})
