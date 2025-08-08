import classNames from 'classnames'
import { memo, useCallback } from 'react'
import { useDialogs } from 'tldraw'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
import { F } from '../../utils/i18n'
import styles from './dialogs.module.css'
import { TlaManageCookiesDialog } from './TlaManageCookiesDialog'

export const TlaCookieConsent = memo(function TlaSidebarCookieConsent() {
	const { addDialog } = useDialogs()
	const [, updateConsent] = useAnalyticsConsent()

	const handleAccept = useCallback(() => {
		updateConsent(true)
	}, [updateConsent])

	const handleReject = useCallback(() => {
		updateConsent(false)
	}, [updateConsent])

	const handleCustomize = useCallback(() => {
		addDialog({
			component: () => <TlaManageCookiesDialog />,
		})
	}, [addDialog])

	return (
		<div className={styles.sidebarCookieConsent} data-testid="tla-sidebar-cookie-consent">
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
						className={classNames(
							'tla-button-text',
							styles.sidebarCookieButton,
							styles.sidebarCookieAcceptButton,
							styles.hoverable
						)}
						onClick={handleAccept}
					>
						<F defaultMessage="Accept all" />
					</button>
				</div>
			</div>
		</div>
	)
})
