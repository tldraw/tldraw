import classNames from 'classnames'
import { TldrawUiIcon, useLocalStorageState } from 'tldraw'
import { F } from '../../../utils/i18n'
import { ExternalLink } from '../../ExternalLink/ExternalLink'
import styles from '../sidebar.module.css'

export function TlaSidebarDotdevLink() {
	const [showDotdevLink, setShowDotdevLink] = useLocalStorageState('showDotdevLink', true)
	if (!showDotdevLink) return null

	return (
		<div className={styles.sidebarDotdevLink}>
			<ExternalLink to="https://tldraw.dev" data-testid="tla-sidebar-dotdev-link">
				<F defaultMessage="Build with the tldraw SDK" />
				<TldrawUiIcon icon="arrow-left" label="Build with the tldraw SDK" small />
			</ExternalLink>
			<button
				title="I would prefer not to build with the tldraw SDK"
				data-testid="tla-sidebar-dotdev-dismiss-button"
				className={classNames(styles.sidebarDotDevDismissButton, styles.hoverable)}
				onClick={() => setShowDotdevLink(false)}
			>
				<TldrawUiIcon icon="cross-2" label="Hide" small />
			</button>
		</div>
	)
}
