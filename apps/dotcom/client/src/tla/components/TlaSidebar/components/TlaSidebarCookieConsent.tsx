import classNames from 'classnames'
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
		<div className={styles.sidebarCookieConsent}>
			<p className={styles.sidebarCookieText}>
				<F defaultMessage="This site uses cookies to make the app work and to collect analytics." />
			</p>
			<div className={styles.sidebarCookieButtonsRow}>
				<button
					className={classNames('tla-button-text', styles.sidebarCookieButton, styles.hoverable)}
					onClick={handleCustomize}
				>
					<F defaultMessage="Settings" />
				</button>
				<div className={styles.sidebarCookieButtons}>
					<button
						className={classNames('tla-button-text', styles.sidebarCookieButton, styles.hoverable)}
						onClick={handleReject}
					>
						<F defaultMessage="Opt out" />
					</button>
					<button
						className={`${classNames('tla-button-text', styles.sidebarCookieButton, styles.sidebarCookieAcceptButton, styles.hoverable)} ${styles.acceptButton}`}
						onClick={handleAccept}
					>
						<F defaultMessage="Accept all" />
					</button>
				</div>
			</div>
		</div>
	)
})
