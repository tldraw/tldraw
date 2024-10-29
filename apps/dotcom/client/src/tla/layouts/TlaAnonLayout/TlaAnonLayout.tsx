import { SignedOut } from '@clerk/clerk-react'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TlaSignInButton } from '../../components/TlaSignInButton/TlaSignInButton'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import { useRaw } from '../../hooks/useRaw'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import styles from './anon.module.css'

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	const raw = useRaw()
	usePreventAccidentalDrops()
	const trackEvent = useTldrawAppUiEvents()
	return (
		<div className={styles.layout}>
			<div className={styles.header}>
				<Link to="/">
					<img src="/tla/tldraw-logo-2.svg" style={{ height: 20, width: 'auto' }} />
				</Link>
				<div className={styles.signInButtons}>
					<SignedOut>
						<TlaSignInButton
							onClick={() => trackEvent('sign-in-button', { source: 'anon-landing-page' })}
							variant="primary"
							ghost
						>
							{raw('Log in')}
						</TlaSignInButton>
						<TlaSignInButton
							onClick={() => trackEvent('sign-up-button', { source: 'anon-landing-page' })}
							data-testid="tla-signup-button"
						>
							{raw('Sign up')}
						</TlaSignInButton>
					</SignedOut>
				</div>
			</div>
			<div className={styles.editorWrapper}>{children}</div>
			<div className={classNames(styles.footer, styles.footerDesktop, 'tla-text_ui__regular')}>
				<p>
					<b>{raw('tldraw')}</b> {raw(' is a free online whiteboard for you and your friends. ')}
					{/* Todo, make the rest of this layout the landing page, learn more should scroll down? */}
					<Link
						onClick={() => trackEvent('learn-more-button', { source: 'anon-landing-page' })}
						to="/"
					>
						{raw('Learn more.')}
					</Link>
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
