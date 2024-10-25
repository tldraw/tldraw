import { SignedOut, SignInButton } from '@clerk/clerk-react'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TlaButton } from '../../components/TlaButton/TlaButton'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import { useRaw } from '../../hooks/useRaw'
import styles from './anon.module.css'

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	const raw = useRaw()
	usePreventAccidentalDrops()
	return (
		<div className={classNames('tla tla-theme__light tl-theme__light tl-container', styles.layout)}>
			<div className={styles.header}>
				<Link to="/">
					<img src="/tla/tldraw-logo-2.svg" style={{ height: 20, width: 'auto' }} />
				</Link>
				<div className={styles.signInButtons}>
					<SignedOut>
						<SignInButton mode="modal" forceRedirectUrl="/q" signUpForceRedirectUrl="/q">
							<TlaButton variant="primary" ghost>
								{raw('Log in')}
							</TlaButton>
						</SignInButton>
						<SignInButton mode="modal" forceRedirectUrl="/q" signUpForceRedirectUrl="/q">
							<TlaButton>{raw('Sign up')}</TlaButton>
						</SignInButton>
					</SignedOut>
				</div>
			</div>
			<div className={styles.editorWrapper}>{children}</div>
			<div className={classNames(styles.footer, styles.footerDesktop, 'tla-text_ui__regular')}>
				<p>
					<b>{raw('tldraw')}</b> {raw(' is a free online whiteboard for you and your friends. ')}
					{/* Todo, make the rest of this layout the landing page, learn more should scroll down? */}
					<Link to="/">{raw('Learn more.')}</Link>
				</p>
			</div>
			<div className={classNames(styles.footer, styles.footerMobile, 'tla-text_ui__regular')}>
				<p>
					{/* Todo, make the rest of this layout the landing page, learn more should scroll down? */}
					<Link to="/">{raw('Learn more.')}</Link>
				</p>
			</div>
		</div>
	)
}
