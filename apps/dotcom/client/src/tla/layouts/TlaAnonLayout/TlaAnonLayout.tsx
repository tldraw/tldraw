import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaButton } from '../../components/TlaButton/TlaButton'
import { useMaybeApp } from '../../hooks/useAppState'
import { USER_ID_KEY } from '../../providers/TlaAppProvider'
import styles from './anon.module.css'

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	const app = useMaybeApp()
	const theme = useValue(
		'theme',
		() => {
			if (!app) return 'light'
			app.getSessionState().theme
		},
		[app]
	)
	const navigate = useNavigate()

	return (
		<div
			className={classNames(
				styles.loggedOut,
				`tla tl-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`
			)}
		>
			<div className={styles.header}>
				<Link to="/">
					<img src="/tla/tldraw-logo-2.svg" style={{ height: 20, width: 'auto' }} />
				</Link>
				<TlaButton
					onClick={() => {
						const userid = window.prompt('Enter your user id (trip code lol)')
						if (!userid) return
						// eslint-disable-next-line no-restricted-syntax
						localStorage.setItem(USER_ID_KEY, userid)
						navigate('/q', { replace: true })
					}}
				>
					Sign in
				</TlaButton>
			</div>
			<div className={styles.editorWrapper}>{children}</div>
			<div className={classNames(styles.footer, 'tla-text_ui__regular')}>
				<p>
					<b>tldraw</b> is a free online whiteboard for you and your friends.{'  '}
					<Link to="/">Learn more</Link>.
				</p>
			</div>
		</div>
	)
}
