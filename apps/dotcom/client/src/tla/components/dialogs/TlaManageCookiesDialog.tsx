import { Tooltip as _Tooltip } from 'radix-ui'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
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

export function TlaManageCookiesDialog() {
	const [consent, updateConsent] = useAnalyticsConsent()

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
							<TlaMenuControlLabel htmlFor="tla-essential-cookies-switch">
								<F defaultMessage="Essential cookies" />
							</TlaMenuControlLabel>
							<TlaMenuControlInfoTooltip showOnMobile>
								<F defaultMessage="We use these cookies to save your files and settings." />
							</TlaMenuControlInfoTooltip>
							<TlaMenuSwitch id="tla-essential-cookies-switch" checked={true} disabled />
						</TlaMenuControl>
						<TlaMenuControl>
							<TlaMenuControlLabel htmlFor="tla-analytics-switch">
								<F defaultMessage="Analytics" />
							</TlaMenuControlLabel>
							<TlaMenuControlInfoTooltip showOnMobile>
								<F defaultMessage="We use analytics cookies to make tldraw better." />
							</TlaMenuControlInfoTooltip>
							<TlaMenuSwitch
								id="tla-analytics-switch"
								checked={consent === true}
								onChange={() => updateConsent(!(consent === true))}
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
