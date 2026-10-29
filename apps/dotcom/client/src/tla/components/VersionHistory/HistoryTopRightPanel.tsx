import { useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { F, TldrawUiButton, usePassThroughWheelEvents, useTranslation } from 'tldraw'
import { routes } from '../../../routeDefs'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { versionHistoryMessages as messages } from './version-history-messages'
import styles from '../TlaEditor/top.module.css'

/** The history toggle, pressed, in the spot it occupies in the live editor; clicking it closes. */
export function HistoryTopRightPanel() {
	const msg = useTranslation()
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	const navigate = useNavigate()
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const label = msg(messages.title)
	return (
		<div ref={ref} className={styles.topRightPanel}>
			<TldrawUiButton
				type="icon"
				className={styles.commentsSidebarButton}
				data-testid="tla-version-history-button"
				aria-pressed
				tooltip={label}
				title={label}
				onClick={() => fileSlug && navigate(routes.tlaFile(fileSlug))}
			>
				<TlaIcon icon="clock" />
			</TldrawUiButton>
			{/* Holds Share's width so the toggle doesn't move. Share itself would act on the
			    preview editor (e.g. publish the old version), so it isn't rendered here. */}
			<TlaCtaButton canvas aria-hidden tabIndex={-1} style={{ visibility: 'hidden' }}>
				<F defaultMessage="Share" />
			</TlaCtaButton>
		</div>
	)
}
