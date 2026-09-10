import {
	TldrawUiButton,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useMenuIsOpen,
} from 'tldraw'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { TLA_MENU_POSITION } from '../../tla-menu/tla-menu'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import {
	TlaSidebarNotificationsPanel,
	useCommentNotifications,
} from './TlaSidebarNotificationsPanel'
import styles from '../sidebar.module.css'
import notifications from './notifications.module.css'

const NOTIFICATIONS_MENU_ID = 'sidebar-notifications'

const messages = defineMessages({
	notifications: { defaultMessage: 'Notifications' },
	unreadNotifications: { defaultMessage: '{count} unread' },
})

/** Opens the notifications popover (comments across the user's files), with an unread badge. */
export function TlaSidebarNotificationsButton() {
	const { unreadCount } = useCommentNotifications()
	// Same id as the popover, so we can dismiss it when a notification is opened.
	const [, onOpenChange] = useMenuIsOpen(NOTIFICATIONS_MENU_ID)
	const label = useMsg(messages.notifications)
	const unreadLabel = useMsg(messages.unreadNotifications, { count: unreadCount })

	return (
		<TldrawUiPopover id={NOTIFICATIONS_MENU_ID}>
			<TldrawUiPopoverTrigger>
				<TldrawUiButton
					type="icon"
					className={styles.sidebarCreateFileButton}
					data-testid="tla-notifications-button"
					title={label}
				>
					<TlaIcon icon="notification" />
					{unreadCount > 0 && <span className={notifications.badge} aria-label={unreadLabel} />}
				</TldrawUiButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent
				side="bottom"
				align="start"
				{...TLA_MENU_POSITION}
				autoFocusFirstButton={false}
			>
				<TlaSidebarNotificationsPanel onClose={() => onOpenChange(false)} />
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}
