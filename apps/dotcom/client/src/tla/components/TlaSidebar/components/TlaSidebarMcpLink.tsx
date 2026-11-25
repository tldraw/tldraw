import classNames from 'classnames'
import { defineMessages, useLocalStorageState, useTranslation } from 'tldraw'
import { ExternalLink } from '../../ExternalLink/ExternalLink'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	tryMcp: { defaultMessage: 'Try the MCP server' },
})

const SEEN_STORAGE_KEY = 'tldraw-dotcom:sidebar-mcp-link:seen'

export function TlaSidebarMcpLink() {
	const msg = useTranslation()
	const [hasSeen, setHasSeen] = useLocalStorageState(SEEN_STORAGE_KEY, false)
	const lbl = msg(messages.tryMcp)
	return (
		<ExternalLink
			className={classNames(styles.sidebarLinkButton, styles.hoverable, 'tla-text_ui__regular')}
			to="https://mcp.tldraw.com"
			data-testid="tla-sidebar-mcp-link"
			eventName="sidebar-mcp-link-clicked"
			onClick={() => setHasSeen(true)}
			// Middle-click opens the link too, so it counts as seeing it.
			onAuxClick={() => setHasSeen(true)}
		>
			<TlaIcon icon="plug" />
			<span className={styles.sidebarLinkButtonLabel}>{lbl}</span>
			{!hasSeen && <span className={styles.sidebarLinkButtonNewDot} aria-hidden="true" />}
		</ExternalLink>
	)
}
