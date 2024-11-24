import { SignedOut } from '@clerk/clerk-react'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TlaAccountMenu } from '../../components/TlaAccountMenu/TlaAccountMenu'
import { TlaIcon } from '../../components/TlaIcon/TlaIcon'
import { TlaSignInButton } from '../../components/TlaSignInButton/TlaSignInButton'
import { TlaSignUpButton } from '../../components/TlaSignUpButton/TlaSignUpButton'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { defineMessages, F, useIntl } from '../../utils/i18n'
import styles from './anon.module.css'

const messages = defineMessages({
	logo: { defaultMessage: 'the tldraw logo' },
	accountMenu: { defaultMessage: 'Account menu' },
})

export function TlaAnonLayout({ children }: { children: ReactNode }) {
	usePreventAccidentalDrops()
	const intl = useIntl()
	const logoAriaLabel = intl.formatMessage(messages.logo)
	const accountMenuLabel = intl.formatMessage(messages.accountMenu)
	const trackEvent = useTldrawAppUiEvents()

	return (
		<div className={styles.layout}>
			<div className={styles.header}>
				<Link to="/">
					<img
						src="/tla/tldraw-logo-2.svg"
						alt={logoAriaLabel}
						style={{ height: 20, width: 'auto' }}
					/>
				</Link>
				<TlaAccountMenu source="anon-top-bar" align="start">
					<button className={styles.linkMenu} title={accountMenuLabel}>
						<TlaIcon icon="dots-vertical-strong" />
					</button>
				</TlaAccountMenu>
				<div className={styles.spacer} />
				<div className={styles.signInButtons}>
					<SignedOut>
						<TlaSignInButton
							onClick={() => trackEvent('sign-in-clicked', { source: 'anon-landing-page' })}
							variant="primary"
							ghost
						>
							<F defaultMessage="Sign in" />
						</TlaSignInButton>
						<TlaSignUpButton
							onClick={() => trackEvent('sign-up-clicked', { source: 'anon-landing-page' })}
							data-testid="tla-signup-button"
						>
							<F defaultMessage="Sign up" />
						</TlaSignUpButton>
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
					<Link
						onClick={() => trackEvent('learn-more-button', { source: 'anon-landing-page' })}
						to="/"
					>
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
