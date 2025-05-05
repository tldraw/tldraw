import { Tooltip as _Tooltip } from 'radix-ui'
import { ReactNode } from 'react'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
} from '../tla-menu/tla-menu'
import styles from './dialogs.module.css'

const COOKIE_POLICY_URL = 'https://tldraw.notion.site/cookie-policy'

export function TlaManageCookiesDialog() {
	const app = useApp()
	const user = useValue('user', () => app.getUser(), [app])

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
							defaultMessage="We use cookies to keep you logged in, to sync your files, and to collect analytics to help us improve tldraw. Read our <a>cookie policy</a> to learn more."
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
						<CookieDialogToggle
							title={<F defaultMessage="Essential cookies" />}
							description={
								<F
									defaultMessage="We use these cookies to save your files and settings."
									values={{ b: (chunks) => <strong>{chunks}</strong> }}
								/>
							}
							checked={true}
						/>
						<CookieDialogToggle
							title={<F defaultMessage="Analytics" />}
							description={
								<F
									defaultMessage="We use analytics cookies to make tldraw better."
									values={{ b: (chunks) => <strong>{chunks}</strong> }}
								/>
							}
							checked={!!app.getUser().allowAnalyticsCookie}
							onChange={() => {
								app.updateUser({ id: user.id, allowAnalyticsCookie: !user.allowAnalyticsCookie })
							}}
						/>
					</TlaMenuControlGroup>
				</TldrawUiDialogBody>
				<TldrawUiDialogFooter />
			</div>
		</_Tooltip.Provider>
	)
}

function CookieDialogToggle({
	title,
	description,
	checked,
	onChange,
}: {
	title: ReactNode
	description: ReactNode
	checked: boolean
	onChange?(checked: boolean): void
}) {
	const trackEvent = useTldrawAppUiEvents()

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{title}</TlaMenuControlLabel>
			<TlaMenuControlInfoTooltip
				onClick={() =>
					trackEvent('open-url', { url: COOKIE_POLICY_URL, source: 'cookie-settings' })
				}
			>
				{description}
			</TlaMenuControlInfoTooltip>
			<TlaSwitch checked={checked} onChange={onChange} disabled={!onChange} />
		</TlaMenuControl>
	)
}
