import { SignedOut, SignInButton } from '@clerk/clerk-react'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { defineMessages, F, useIntl } from '../../app/i18n'
import { TlaAccountMenu } from '../../components/TlaAccountMenu/TlaAccountMenu'
import { TlaButton } from '../../components/TlaButton/TlaButton'
import { TlaIcon } from '../../components/TlaIcon/TlaIcon'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import styles from './anon.module.css'

const messages = defineMessages({
	logo: { defaultMessage: 'the tldraw logo' },
})

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	usePreventAccidentalDrops()
	const intl = useIntl()
	const logoAriaLabel = intl.formatMessage(messages.logo)

	return (
		<div className={classNames('tla tla-theme__light tl-theme__light tl-container', styles.layout)}>
			<div className={styles.header}>
				<Link to="/">
					<img
						src="/tla/tldraw-logo-2.svg"
						alt={logoAriaLabel}
						style={{ height: 20, width: 'auto' }}
					/>
				</Link>
				<TlaAccountMenu source="anon-top-bar" align="start">
					<button className={styles.linkMenu}>
						<TlaIcon icon="dots-vertical-strong" />
					</button>
				</TlaAccountMenu>
				<div className={styles.spacer} />
				<div className={styles.signInButtons}>
					<SignedOut>
						<SignInButton mode="modal" forceRedirectUrl="/q" signUpForceRedirectUrl="/q">
							<TlaButton data-testid="tla-signin-button" variant="primary" ghost>
								<F defaultMessage="Sign in" />
							</TlaButton>
						</SignInButton>
						<SignInButton mode="modal" forceRedirectUrl="/q" signUpForceRedirectUrl="/q">
							<TlaButton data-testid="tla-signup-button">
								<F defaultMessage="Sign up" />
							</TlaButton>
						</SignInButton>
					</SignedOut>
				</div>
			</div>
			<div className={styles.editorWrapper}>{children}</div>
			<div className={classNames(styles.footer, styles.footerDesktop, 'tla-text_ui__regular')}>
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
			<div className={classNames(styles.footer, styles.footerMobile, 'tla-text_ui__regular')}>
				<p>
					{/* Todo, make the rest of this layout the landing page, learn more should scroll down? */}
					<Link to="/">
						<F defaultMessage="Learn more." />
					</Link>
				</p>
			</div>
		</div>
	)
}
