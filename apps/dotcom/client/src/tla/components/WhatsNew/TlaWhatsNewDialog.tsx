import { useEffect, useRef } from 'react'
import {
	defineMessages,
	F,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TLUiDialogProps,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useApp } from '../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getSeenAtAfterShowing, whatsNewUpdates$ } from '../../utils/whatsNew'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { TlaWhatsNewUpdate } from './TlaWhatsNewUpdate'
import styles from './whats-new.module.css'

const messages = defineMessages({
	openPage: { defaultMessage: 'Open all updates in a new tab' },
})

export function TlaWhatsNewDialog({
	onClose,
	trigger,
}: TLUiDialogProps & { trigger: 'auto' | 'menu' }) {
	const app = useApp()
	const msg = useTranslation()
	const trackEvent = useTldrawAppUiEvents()
	const updates = useValue('whats new updates', () => whatsNewUpdates$.get() ?? [], [])
	const autoOpen = useValue('whats new auto open', () => app.getUser().whatsNewAutoOpen !== false, [
		app,
	])
	// Staff also get Drafts (listed first); auto-open is about the newest Published one.
	const latest = updates.find((u) => u.status === 'published') ?? updates[0]

	// Once per open, against the Update as first shown.
	const shownRef = useRef(latest)
	useEffect(() => {
		trackEvent('whats-new-open', { source: 'whats-new', trigger })
		const next = shownRef.current ? getSeenAtAfterShowing([shownRef.current]) : null
		const user = app.getUser()
		if (next !== null && next > (user.whatsNewSeenAt ?? 0)) {
			app.updateUser({ whatsNewSeenAt: next })
		}
	}, [app, trackEvent, trigger])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle className={styles.dialogTitle}>
					<F defaultMessage="What's new" />
				</TldrawUiDialogTitle>
				<TldrawUiButton
					type="icon"
					title={msg(messages.openPage)}
					aria-label={msg(messages.openPage)}
					onClick={() => {
						trackEvent('whats-new-open-page', { source: 'whats-new' })
						window.open(routes.tlaWhatsNew(), '_blank', 'noopener,noreferrer')
					}}
				>
					<TlaIcon icon="external" />
				</TldrawUiButton>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<div data-testid="whats-new-dialog">{latest && <TlaWhatsNewUpdate update={latest} />}</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className={styles.dialogFooter}>
				<label className={styles.autoOpen}>
					<input
						type="checkbox"
						checked={autoOpen}
						onChange={(e) => {
							app.updateUser({ whatsNewAutoOpen: e.target.checked })
							if (!e.target.checked) {
								trackEvent('whats-new-auto-open-disabled', { source: 'whats-new' })
							}
						}}
					/>
					<F defaultMessage="Show this next time" />
				</label>
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Close" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
