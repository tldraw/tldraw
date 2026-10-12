import {
	defineMessages,
	TldrawUiButton,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useMenuIsOpen,
	useTranslation,
} from 'tldraw'
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
	// Both forms read the same in English, where "unread" doesn't inflect. Declared anyway, so a
	// translator gets the slots for languages where the adjective agrees with the count.
	unreadNotifications: {
		defaultMessage: '{count, plural, one {# unread} other {# unread}}',
	},
})

/** Opens the notifications popover (comments across the user's files), with an unread badge. */
export function TlaSidebarNotificationsButton() {
	const msg = useTranslation()
	const { unreadCount } = useCommentNotifications()
	// Same id as the popover, so we can dismiss it when a notification is opened.
	const [, onOpenChange] = useMenuIsOpen(NOTIFICATIONS_MENU_ID)

	return (
		<TldrawUiPopover id={NOTIFICATIONS_MENU_ID}>
			<TldrawUiPopoverTrigger>
				<TldrawUiButton
					type="icon"
					className={styles.sidebarCreateFileButton}
					data-testid="tla-notifications-button"
					title={msg(messages.notifications.id)}
				>
					<TlaIcon icon="notification" />
					{unreadCount > 0 && (
						<span
							className={notifications.badge}
							aria-label={msg(messages.unreadNotifications.id, { count: unreadCount })}
						/>
					)}
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
