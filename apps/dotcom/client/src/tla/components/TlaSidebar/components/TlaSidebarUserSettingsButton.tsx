import classNames from 'classnames'
import { defineMessages, F, TldrawUiButton, useDialogs, useTranslation, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { TlaSettingsDialog } from '../../dialogs/TlaSettingsDialog'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { TlaUserAvatar } from '../../TlaUserAvatar/TlaUserAvatar'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	userSettings: { defaultMessage: 'User settings' },
})

export function TlaSidebarUserSettingsButton() {
	const msg = useTranslation()
	const app = useApp()
	const { addDialog } = useDialogs()
	const userSettingsLbl = msg(messages.userSettings)
	const user = useValue('auth', () => app.getUser(), [app])

	return (
		<TldrawUiButton
			type="menu"
			tooltip={userSettingsLbl}
			title={userSettingsLbl}
			className={classNames(styles.sidebarUserSettingsTrigger, styles.hoverable)}
			data-testid="tla-sidebar-user-settings-trigger"
			onClick={() => addDialog({ component: () => <TlaSettingsDialog /> })}
		>
			<TlaUserAvatar user={user} className={styles.sidebarUserSettingsAvatar} />
			<div
				className={classNames(
					styles.sidebarUserSettingsName,
					'tla-text_ui__regular',
					'notranslate'
				)}
			>
				{user.name || <F defaultMessage="Account" />}
			</div>
			<div className={styles.sidebarUserSettingsIcon}>
				<TlaIcon icon="help-circle" />
			</div>
		</TldrawUiButton>
	)
}
