import classNames from 'classnames'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { useMsg } from '../../../utils/i18n'
import { TlaAccountMenu } from '../../TlaAccountMenu/TlaAccountMenu'
import { TlaAvatar } from '../../TlaAvatar/TlaAvatar'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarUserLink() {
	const app = useApp()
	const accountMenuLbl = useMsg(messages.accountMenu)

	const user = useValue('auth', () => app.getUser(), [app])
	if (!user) return null

	return (
		<div className={classNames(styles.user, 'tla-text_ui__regular')}>
			<TlaAvatar img={user.avatar} />
			<div className={classNames(styles.userName, 'notranslate')}>{user.name}</div>
			<TlaAccountMenu source="sidebar">
				<button className={classNames(styles.linkMenu, styles.hoverable)} title={accountMenuLbl}>
					<TlaIcon icon="dots-vertical-strong" />
				</button>
			</TlaAccountMenu>
		</div>
	)
}
