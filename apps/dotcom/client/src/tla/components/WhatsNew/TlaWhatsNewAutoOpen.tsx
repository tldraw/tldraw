import classNames from 'classnames'
import { useEffect } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuItem,
	useDialogs,
	useTranslation,
	useValue,
} from 'tldraw'
import { ROUTES } from '../../../routeDefs'
import { TldrawApp } from '../../app/TldrawApp'
import { useIsAppLoading, useMaybeApp } from '../../hooks/useAppState'
import { useTldrawCurrentUser } from '../../hooks/useUser'
import { getUnreadUpdates, loadWhatsNew, whatsNewUpdates$ } from '../../utils/whatsNew'
import { WHATS_NEW_E2E_DISABLE_AUTO_OPEN_KEY } from '../../utils/whatsNewE2e'
import { TlaWhatsNewDialog } from './TlaWhatsNewDialog'
import styles from './whats-new.module.css'

const messages = defineMessages({
	whatsNew: { defaultMessage: "What's new" },
	newUpdates: { defaultMessage: 'New updates' },
})

let hasAutoOpened = false

function isAutoOpenDisabledForE2e() {
	try {
		return !!window.localStorage.getItem(WHATS_NEW_E2E_DISABLE_AUTO_OPEN_KEY)
	} catch {
		return false
	}
}

/** Home or the user's own files only: not admin, the public page, or shared and published links. */
function isAutoOpenRoute(app: TldrawApp, pathname: string) {
	if (matchPath(ROUTES.tlaRoot, pathname)) return true
	const fileSlug = matchPath(ROUTES.tlaFile, pathname)?.params.fileSlug
	// Not `getFile`: a shared file the user opens is linked into their home workspace too.
	return !!fileSlug && app.canUpdateFile(fileSlug)
}

export function TlaWhatsNewAutoOpen() {
	const app = useMaybeApp()
	const isAppLoading = useIsAppLoading()
	const user = useTldrawCurrentUser()
	const { pathname } = useLocation()
	const { addDialog, dialogs } = useDialogs()

	useEffect(() => {
		if (!app || isAppLoading || hasAutoOpened) return
		let cancelled = false
		loadWhatsNew({ includeDrafts: !!user?.isTldraw }).then((updates) => {
			if (cancelled || !updates || hasAutoOpened) return
			const tlaUser = app.getUser()
			if (getUnreadUpdates(updates, tlaUser).length === 0) return
			if (tlaUser.whatsNewAutoOpen === false) return
			if (isAutoOpenDisabledForE2e()) return
			if (dialogs.get().length > 0) return
			if (!isAutoOpenRoute(app, pathname)) return
			hasAutoOpened = true
			addDialog({ component: (props) => <TlaWhatsNewDialog {...props} trigger="auto" /> })
		})
		return () => {
			cancelled = true
		}
		// Decided once per boot, against the route the app booted on.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [app, isAppLoading])

	return null
}

export function useHasUnreadWhatsNew(app: TldrawApp | null) {
	return useValue(
		'has unread whats new',
		() => {
			const updates = whatsNewUpdates$.get()
			if (!app || !updates) return false
			return getUnreadUpdates(updates, app.getUser()).length > 0
		},
		[app]
	)
}

export function TlaWhatsNewDot({ className }: { className?: string }) {
	const msg = useTranslation()
	return (
		<span
			className={classNames(styles.dot, className)}
			aria-label={msg(messages.newUpdates)}
			data-testid="whats-new-dot"
		/>
	)
}

export function WhatsNewMenuItem() {
	const app = useMaybeApp()
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const hasUpdates = useValue('has whats new', () => !!whatsNewUpdates$.get()?.length, [])
	const hasUnread = useHasUnreadWhatsNew(app)
	if (!app || !hasUpdates) return null
	return (
		<TldrawUiDropdownMenuItem>
			<TldrawUiButton
				type="menu"
				data-testid="tla-whats-new-menu-item"
				onClick={() =>
					addDialog({ component: (props) => <TlaWhatsNewDialog {...props} trigger="menu" /> })
				}
			>
				<TldrawUiButtonLabel>{msg(messages.whatsNew)}</TldrawUiButtonLabel>
				{hasUnread && <TlaWhatsNewDot />}
			</TldrawUiButton>
		</TldrawUiDropdownMenuItem>
	)
}
