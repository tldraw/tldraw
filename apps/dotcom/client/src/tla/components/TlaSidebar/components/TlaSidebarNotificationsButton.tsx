import classNames from 'classnames'
import { useRef } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useMenuIsOpen,
	useTranslation,
} from 'tldraw'
import { TLA_MENU_POSITION } from '../../tla-menu/tla-menu-position'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { TlaSidebarNotificationsPanel } from './TlaSidebarNotificationsPanel'
import { useCommentNotifications } from './useCommentNotifications'
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
	const [isOpen, onOpenChange] = useMenuIsOpen(NOTIFICATIONS_MENU_ID)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const alignOffset = isOpen ? getAlignOffset(triggerRef.current) : TLA_MENU_POSITION.alignOffset

	return (
		<TldrawUiPopover id={NOTIFICATIONS_MENU_ID}>
			<TldrawUiPopoverTrigger>
				<TldrawUiButton
					ref={triggerRef}
					type="icon"
					className={classNames(styles.sidebarCreateFileButton, notifications.button)}
					data-testid="tla-notifications-button"
					title={msg(messages.notifications)}
				>
					<TlaIcon icon="notification" />
					{unreadCount > 0 && (
						<span
							className={notifications.badge}
							aria-label={msg(messages.unreadNotifications, { count: unreadCount })}
						/>
					)}
				</TldrawUiButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent
				side="top"
				align="start"
				{...TLA_MENU_POSITION}
				alignOffset={alignOffset}
				autoFocusFirstButton={false}
			>
				<TlaSidebarNotificationsPanel onClose={() => onOpenChange(false)} />
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}

/** The sidebar's horizontal padding, which the workspace switcher's trigger sits inside. */
const SIDEBAR_PADDING_X = 12

/**
 * Line the panel's left edge up with the workspace switcher menu's: the sidebar's padding, pulled
 * out by the shared menu offset. The bell sits at the right of its row, so aligning to the bell
 * itself would put the panel wherever its width happened to land.
 */
function getAlignOffset(trigger: HTMLElement | null) {
	const sidebar = trigger?.closest('[data-testid="tla-sidebar"]')
	if (!trigger || !sidebar) return TLA_MENU_POSITION.alignOffset
	const target =
		sidebar.getBoundingClientRect().left + SIDEBAR_PADDING_X + TLA_MENU_POSITION.alignOffset
	return target - trigger.getBoundingClientRect().left
}
