import classNames from 'classnames'
import { useRef, useState } from 'react'
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
import { NOTIFICATIONS_MENU_ID } from './openNotificationsPanel'
import { TlaSidebarNotificationsPanel } from './TlaSidebarNotificationsPanel'
import { useCommentNotifications } from './useCommentNotifications'
import styles from '../sidebar.module.css'
import notifications from './notifications.module.css'

const messages = defineMessages({
	notifications: { defaultMessage: 'Notifications' },
	// Both forms read the same in English, where "unread" doesn't inflect. Declared anyway, so a
	// translator gets the slots for languages where the adjective agrees with the count.
	unreadNotifications: {
		defaultMessage: '{count, plural, one {# unread} other {# unread}}',
	},
})

/**
 * Opens the notifications popover (comments across the user's files), with an unread badge. In the
 * sidebar footer it opens upward; in the v3 workspace header, downward from the header's end.
 */
export function TlaSidebarNotificationsButton({
	placement = 'sidebar',
}: {
	placement?: 'sidebar' | 'header'
}) {
	const msg = useTranslation()
	const { unreadCount } = useCommentNotifications()
	// Same id as the popover, so we can dismiss it when a notification is opened.
	const [, onOpenChange] = useMenuIsOpen(NOTIFICATIONS_MENU_ID)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const [alignOffset, setAlignOffset] = useState<number>(TLA_MENU_POSITION.alignOffset)
	const isHeader = placement === 'header'

	return (
		<TldrawUiPopover
			id={NOTIFICATIONS_MENU_ID}
			onOpenChange={(open) => {
				if (open && !isHeader) setAlignOffset(getAlignOffset(triggerRef.current))
			}}
		>
			<TldrawUiPopoverTrigger>
				<TldrawUiButton
					ref={triggerRef}
					type="icon"
					className={
						isHeader
							? classNames(notifications.button, notifications.headerButton)
							: classNames(styles.sidebarCreateFileButton, notifications.button)
					}
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
				side={isHeader ? 'bottom' : 'top'}
				align={isHeader ? 'end' : 'start'}
				{...TLA_MENU_POSITION}
				alignOffset={alignOffset}
				sideOffset={4}
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
 * Line the panel's leading edge up with the workspace switcher menu's: the sidebar's padding, pulled
 * out by the shared menu offset. The bell sits at the far end of its row, so aligning to the bell
 * itself would put the panel wherever its width happened to land. Measured along the inline axis,
 * since the sidebar (and the popover's `start` edge) is on the right in a right-to-left layout.
 */
function getAlignOffset(trigger: HTMLElement | null) {
	const sidebar = trigger?.closest('[data-testid="tla-sidebar"]')
	if (!trigger || !sidebar) return TLA_MENU_POSITION.alignOffset
	const sidebarRect = sidebar.getBoundingClientRect()
	const triggerRect = trigger.getBoundingClientRect()
	const isRtl = getComputedStyle(sidebar).direction === 'rtl'
	const triggerInset = isRtl
		? sidebarRect.right - triggerRect.right
		: triggerRect.left - sidebarRect.left
	return SIDEBAR_PADDING_X + TLA_MENU_POSITION.alignOffset - triggerInset
}
