import { useAuth } from '@clerk/clerk-react'
import {
	defineMessages,
	F,
	PORTRAIT_BREAKPOINT,
	TldrawUiButton,
	TldrawUiIcon,
	useBreakpoint,
	useEditor,
	useLocalStorageState,
	useTranslation,
	useValue,
} from 'tldraw'
import { trackEvent } from '../../../utils/analytics'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import styles from './TlaAnonDotDevLink.module.css'

const messages = defineMessages({
	dismiss: { defaultMessage: 'Dismiss' },
})

const STORAGE_KEY = 'tldraw-dotcom:anon-dotdev-link:dismissed'

export function TlaAnonDotDevLink() {
	const msg = useTranslation()
	const { isSignedIn, isLoaded } = useAuth()
	const [isDismissed, setIsDismissed] = useLocalStorageState(STORAGE_KEY, false)
	const dismissLbl = msg(messages.dismiss)
	const editor = useEditor()
	const isDebugMode = useValue('debug mode', () => editor.getInstanceState().isDebugMode, [editor])
	const breakpoint = useBreakpoint()

	if (!isLoaded || isSignedIn !== false) return null
	if (isDismissed) return null
	if (breakpoint < PORTRAIT_BREAKPOINT.MOBILE) return null

	return (
		<div className={styles.anonDotDevLink} data-debug={isDebugMode}>
			<div>
				<ExternalLink
					to="https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=anon-overlay-link"
					data-testid="tla-anon-dotdev-link"
					eventName="anon-dotdev-link-clicked"
				>
					<F defaultMessage="Build with the tldraw SDK" />
					<TldrawUiIcon icon="arrow-left" label="Build with the tldraw SDK" small />
				</ExternalLink>
				<TldrawUiButton
					type="icon"
					title={dismissLbl}
					aria-label={dismissLbl}
					data-testid="tla-anon-dotdev-dismiss-button"
					className={styles.anonDotDevDismissButton}
					onClick={() => {
						trackEvent('anon-dotdev-link-dismissed')
						setIsDismissed(true)
					}}
				>
					<TldrawUiIcon icon="cross-2" label={dismissLbl} small />
				</TldrawUiButton>
			</div>
		</div>
	)
}
