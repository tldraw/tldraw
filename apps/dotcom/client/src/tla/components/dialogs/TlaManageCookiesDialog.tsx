import { useAuth } from '@clerk/clerk-react'
import { Tooltip as _Tooltip } from 'radix-ui'
import { useState } from 'react'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useValue,
} from 'tldraw'
import {
	configureAnalytics,
	getStoredAnalyticsConsent,
	setStoredAnalyticsConsent,
} from '../../../utils/analytics'
import { useMaybeApp } from '../../hooks/useAppState'
import { F } from '../../utils/i18n'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
	TlaMenuSwitch,
} from '../tla-menu/tla-menu'
import styles from './dialogs.module.css'

const COOKIE_POLICY_URL = 'https://tldraw.notion.site/cookie-policy'

export function TlaManageCookiesDialog({ onChange }: { onChange?(): void }) {
	const app = useMaybeApp()
	const auth = useAuth()
	const user = useValue('user', () => app?.getUser(), [app])
	const isSignedIn = auth.isSignedIn

	// Get current consent status
	const getCurrentConsent = () => {
		if (isSignedIn && user && app) {
			return user.allowAnalyticsCookie
		} else {
			return getStoredAnalyticsConsent()
		}
	}

	// Initialize local state with current consent
	const [localConsent, setLocalConsent] = useState(getCurrentConsent())

	// Handle consent change
	const handleConsentChange = (newConsent: boolean) => {
		onChange?.()
		// Update local state immediately for UI responsiveness
		setLocalConsent(newConsent)

		if (isSignedIn && user && app) {
			app.updateUser({ id: user.id, allowAnalyticsCookie: newConsent })
			// Also update localStorage to keep them in sync
			setStoredAnalyticsConsent(newConsent)
			// Immediately configure analytics
			configureAnalytics(newConsent, { id: user.id, name: user.name, email: user.email })
		} else {
			setStoredAnalyticsConsent(newConsent)
			// Immediately configure analytics for signed-out users
			configureAnalytics(newConsent)
		}
	}

	return (
		<_Tooltip.Provider>
			<div className={styles.dialogContainer}>
				<TldrawUiDialogHeader>
					<TldrawUiDialogTitle>
						<F defaultMessage="Manage cookies" />
					</TldrawUiDialogTitle>
					<TldrawUiDialogCloseButton />
				</TldrawUiDialogHeader>
				<TldrawUiDialogBody className={styles.dialogBody}>
					<p>
						<F
							defaultMessage="We use cookies to keep you logged in, to sync your files, and to collect analytics to help us improve tldraw."
							values={{
								a: (chunks) => (
									<a href={COOKIE_POLICY_URL} target="_blank" rel="noreferrer">
										{chunks}
									</a>
								),
							}}
						/>
					</p>
					<TlaMenuControlGroup>
						<TlaMenuControl>
							<TlaMenuControlLabel>
								<F defaultMessage="Essential cookies" />
							</TlaMenuControlLabel>
							<TlaMenuControlInfoTooltip>
								<F defaultMessage="We use these cookies to save your files and settings." />
							</TlaMenuControlInfoTooltip>
							<TlaMenuSwitch checked={true} disabled />
						</TlaMenuControl>
						<TlaMenuControl>
							<TlaMenuControlLabel>
								<F defaultMessage="Analytics" />
							</TlaMenuControlLabel>
							<TlaMenuControlInfoTooltip>
								<F defaultMessage="We use analytics cookies to make tldraw better." />
							</TlaMenuControlInfoTooltip>
							<TlaMenuSwitch
								checked={localConsent === true}
								onChange={() => handleConsentChange(!localConsent)}
							/>
						</TlaMenuControl>
					</TlaMenuControlGroup>
					<p>
						<F
							defaultMessage="Read our <a>cookie policy</a> to learn more."
							values={{
								a: (chunks) => (
									<a href={COOKIE_POLICY_URL} target="_blank" rel="noreferrer">
										{chunks}
									</a>
								),
							}}
						/>
					</p>
				</TldrawUiDialogBody>
			</div>
		</_Tooltip.Provider>
	)
}
