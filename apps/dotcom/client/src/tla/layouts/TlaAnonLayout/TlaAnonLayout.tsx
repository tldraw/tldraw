import { SignedOut, SignInButton } from '@clerk/clerk-react'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { F } from '../../app/i18n'
import { TlaButton } from '../../components/TlaButton/TlaButton'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import styles from './anon.module.css'

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	usePreventAccidentalDrops()
	return (
		<div
			className={classNames('tla tla-theme__light tl-theme-light tl-container', styles.loggedOut)}
		>
			<div className={styles.header}>
				<Link to="/">
					<img src="/tla/tldraw-logo-2.svg" style={{ height: 20, width: 'auto' }} />
				</Link>
				<SignedOut>
					<SignInButton forceRedirectUrl="/q">
						<TlaButton>
							<F defaultMessage="Sign in" />
						</TlaButton>
					</SignInButton>
				</SignedOut>
			</div>
			<div className={styles.editorWrapper}>{children}</div>
			<div className={classNames(styles.footer, 'tla-text_ui__regular')}>
				<p>
					<F
						defaultMessage="<b>tldraw</b> is a free online whiteboard for you and your friends."
						values={{ b: (chunks) => <b>{chunks}</b> }}
					/>{' '}
					{/* Todo, make the rest of this layout the landing page, learn more should scroll down? */}
					<Link to="/">
						<F defaultMessage="Learn more." />
					</Link>
				</p>
			</div>
		</div>
	)
}
