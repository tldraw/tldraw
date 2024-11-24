import classNames from 'classnames'
import { useIntl } from 'react-intl'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { TlaAccountMenu } from '../../TlaAccountMenu/TlaAccountMenu'
import { TlaAvatar } from '../../TlaAvatar/TlaAvatar'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarUserLink() {
	const app = useApp()
	const intl = useIntl()
	const accountMenuLbl = intl.formatMessage(messages.accountMenu)

	const user = useValue(
		'auth',
		() => {
			return app.getUser()
		},
		[app]
	)

	if (!user) {
		return null
	}

	return (
		<TlaAccountMenu source="sidebar">
			<div className={classNames(styles.user, styles.hoverable, 'tla-text_ui__regular')}>
				<TlaAvatar img={user.avatar} />
				<div className={classNames(styles.userName, 'notranslate')}>{user.name}</div>
				<button className={styles.linkMenu} title={accountMenuLbl}>
					<TlaIcon icon="dots-vertical-strong" />
				</button>
			</div>
		</TlaAccountMenu>
	)
}
