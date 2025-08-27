import classNames from 'classnames'
import { memo, useCallback } from 'react'
import { useDialogs, useValue } from 'tldraw'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
import { F } from '../../utils/i18n'
import styles from './dialogs.module.css'
import { TlaManageCookiesDialog } from './TlaManageCookiesDialog'

const MANAGE_COOKIES_DIALOG = 'manageCookiesDialog'

export const TlaCookieConsent = memo(function TlaCookieConsent() {
	const { addDialog, dialogs } = useDialogs()
	const isManageCookiesDialogShown = useValue(
		'isManageCookiesDialogShown',
		() => dialogs.get().some((d) => d.id === MANAGE_COOKIES_DIALOG),
		[dialogs]
	)
	const [consent, updateConsent] = useAnalyticsConsent()

	const handleAccept = useCallback(() => {
		updateConsent(true)
	}, [updateConsent])

	const handleReject = useCallback(() => {
		updateConsent(false)
	}, [updateConsent])

	const handleCustomize = useCallback(() => {
		addDialog({
			component: () => <TlaManageCookiesDialog />,
			id: MANAGE_COOKIES_DIALOG,
		})
	}, [addDialog])

	if (consent !== null || isManageCookiesDialogShown) return null

	return (
		<div className={styles.cookieConsentWrapper}>
			<div className={styles.cookieConsent} data-testid="tla-cookie-consent">
				<p className={styles.cookieText}>
					<F defaultMessage="This site uses cookies to make the app work and to collect analytics." />
				</p>
				<div className={styles.cookieButtonsRow}>
					<button
						className={classNames('tla-button-text', styles.cookieButton, styles.hoverable)}
						onClick={handleCustomize}
					>
						<F defaultMessage="Settings" />
					</button>
					<div className={styles.cookieButtons}>
						<button
							className={classNames('tla-button-text', styles.cookieButton, styles.hoverable)}
							onClick={handleReject}
						>
							<F defaultMessage="Opt out" />
						</button>
						<button
							className={classNames(
								'tla-button-text',
								styles.cookieButton,
								styles.cookieAcceptButton,
								styles.hoverable
							)}
							onClick={handleAccept}
						>
							<F defaultMessage="Accept all" />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
})
