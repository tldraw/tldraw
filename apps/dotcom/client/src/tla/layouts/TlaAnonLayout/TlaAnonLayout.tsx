import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TlaButton } from '../../components/TlaButton/TlaButton'
import styles from './anon.module.css'

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	return (
		<div className={classNames(styles.loggedOut)}>
			<div className={styles.header}>
				<Link to="/">
					<img src="/tla/tldraw-logo-2.svg" style={{ height: 20, width: 'auto' }} />
				</Link>
				<TlaButton>Sign in</TlaButton>
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
