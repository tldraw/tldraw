import classNames from 'classnames'
import {
	PORTRAIT_BREAKPOINT,
	TldrawUiButton,
	TldrawUiIcon,
	useBreakpoint,
	useLocalStorageState,
} from 'tldraw'
import { trackEvent } from '../../../../utils/analytics'
import { defineMessages, F, useMsg } from '../../../utils/i18n'
import { ExternalLink } from '../../ExternalLink/ExternalLink'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	dismiss: { defaultMessage: 'Dismiss' },
})

export function TlaAnonDotDevLink() {
	const [showDotDevLink, setShowDotDevLink] = useLocalStorageState('showDotDevLink', true)
	const breakpoint = useBreakpoint()
	const dismissLbl = useMsg(messages.dismiss)

	if (!showDotDevLink) return null
	if (breakpoint < PORTRAIT_BREAKPOINT.TABLET) return null

	return (
		<div className={styles.anonDotDevLink}>
			<ExternalLink
				to="https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=anon-overlay-link"
				data-testid="tla-anon-dotdev-link"
				eventName="anon-dotdev-link-clicked"
				onClick={() => {
					setShowDotDevLink(false)
				}}
			>
				<F defaultMessage="Build with the tldraw SDK" />
				<TldrawUiIcon icon="arrow-left" label="Build with the tldraw SDK" small />
			</ExternalLink>
			<TldrawUiButton
				type="icon"
				tooltip={dismissLbl}
				aria-label={dismissLbl}
				data-testid="tla-anon-dotdev-dismiss-button"
				className={classNames(styles.anonDotDevDismissButton, styles.hoverable)}
				onClick={() => {
					trackEvent('anon-dotdev-link-dismissed')
					setShowDotDevLink(false)
				}}
			>
				<TldrawUiIcon icon="cross-2" label={dismissLbl} small />
			</TldrawUiButton>
		</div>
	)
}
