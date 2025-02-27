import { ReactNode } from 'react'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { F, defineMessages, useMsg } from '../../utils/i18n'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import { TlaMenuControlLabel } from '../tla-menu/tla-menu'
import styles from './dialogs.module.css'

const messages = defineMessages({
	essential: {
		defaultMessage: 'This cookie is required for tldraw to work, and cannot be disabled.',
	},
})

export function TlaManageCookiesDialog() {
	const app = useApp()
	const user = useValue('user', () => app.getUser(), [app])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Manage cookies" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<F
					defaultMessage="We use cookies to keep you logged in, to sync your files, and to collect analytics to help us improve tldraw. Read our <a>cookie policy</a> to learn more."
					values={{
						a: (chunks) => (
							<a href="https://tldraw.notion.site/cookie-policy" target="_blank" rel="noreferrer">
								{chunks}
							</a>
						),
					}}
				/>
				<div className={styles.cookieControls}>
					<CookieDialogToggle
						title={<F defaultMessage="Your session" />}
						description={
							<F
								defaultMessage="Essential — Required to save your files & settings, and sync them across your devices."
								values={{ b: (chunks) => <strong>{chunks}</strong> }}
							/>
						}
						checked={true}
					/>
					<CookieDialogToggle
						title={<F defaultMessage="Analytics" />}
						description={
							<F
								defaultMessage="Optional — Help us understand how people use tldraw, and how we can make it better."
								values={{ b: (chunks) => <strong>{chunks}</strong> }}
							/>
						}
						checked={!!app.getUser().allowAnalyticsCookie}
						onChange={() => {
							app.updateUser({ id: user.id, allowAnalyticsCookie: !user.allowAnalyticsCookie })
						}}
					/>
				</div>
			</TldrawUiDialogBody>
		</>
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
	const essentialMessage = useMsg(messages.essential)
	return (
		<label className={styles.cookieControl} title={onChange ? undefined : essentialMessage}>
			<TlaMenuControlLabel>
				<div className={styles.cookieControlTitle}>{title}</div>
				<div className={styles.cookieControlDescription}>{description}</div>
			</TlaMenuControlLabel>
			<TlaSwitch checked={checked} onChange={onChange} disabled={!onChange} />
		</label>
	)
}
