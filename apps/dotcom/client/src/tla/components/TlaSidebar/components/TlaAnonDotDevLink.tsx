import { PORTRAIT_BREAKPOINT, TldrawUiIcon, useBreakpoint, useLocalStorageState } from 'tldraw'
import { trackEvent } from '../../../../utils/analytics'
import { ExternalLink } from '../../ExternalLink/ExternalLink'
import styles from '../sidebar.module.css'

export function TlaAnonDotDevLink() {
	const [showDotDevLink, setShowDotDevLink] = useLocalStorageState('showDotDevLink', true)
	const breakpoint = useBreakpoint()

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
				Build with the SDK
				<TldrawUiIcon icon="arrow-left" label="Build with the SDK" small />
			</ExternalLink>
			<button
				title="Dismiss"
				data-testid="tla-anon-dotdev-dismiss-button"
				aria-label="Dismiss"
				className={styles.anonDotDevDismissButton}
				onClick={() => {
					trackEvent('anon-dotdev-link-dismissed')
					setShowDotDevLink(false)
				}}
			>
				<TldrawUiIcon icon="cross-2" label="Hide" small />
			</button>
		</div>
	)
}
