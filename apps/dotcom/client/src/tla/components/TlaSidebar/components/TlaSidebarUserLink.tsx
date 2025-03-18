import classNames from 'classnames'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { useMsg } from '../../../utils/i18n'
import { TlaAccountMenu } from '../../TlaAccountMenu/TlaAccountMenu'
import { TlaAvatar } from '../../TlaAvatar/TlaAvatar'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarUserLink() {
	const app = useApp()
	const accountMenuLbl = useMsg(messages.accountMenu)

	const user = useValue('auth', () => app.getUser(), [app])
	if (!user) return null

	return (
		<TlaAccountMenu source="sidebar">
			<button
				className={classNames(styles.user, 'tla-text_ui__regular')}
				title={accountMenuLbl}
				data-testid="tla-sidebar-user-link"
			>
				<TlaAvatar img={user.avatar} />
				<div className={classNames(styles.userName, 'notranslate')}>{user.name}</div>
			</button>
		</TlaAccountMenu>
	)
}
