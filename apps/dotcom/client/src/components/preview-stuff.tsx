import { SignUpButton } from '@clerk/clerk-react'
import { CSSProperties } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiMenuGroup,
	atom,
	getFromLocalStorage,
	setInLocalStorage,
	useValue,
} from 'tldraw'
import { useTldrawAppUiEvents } from '../tla/utils/app-ui-events'

const STORAGE_KEY = 'tla-preview-hide-blue-dot'
const hideBlueDot$ = atom('hideBlueDot', !!getFromLocalStorage(STORAGE_KEY))
function hideBlueDot() {
	hideBlueDot$.set(true)
	setInLocalStorage(STORAGE_KEY, 'true')
}

export function PreviewBlueDot({ style }: { style?: CSSProperties }) {
	const hideBlueDot = useValue(hideBlueDot$)
	if (hideBlueDot) return null
	return (
		<span
			style={{
				width: 8,
				height: 8,
				borderRadius: '50%',
				backgroundColor: 'var(--color-selected)',
				display: 'inline-block',
				border: '1px solid',
				borderColor: 'var(--color-background)',
				...style,
			}}
		/>
	)
}

export function PreviewMenuItem() {
	const trackEvent = useTldrawAppUiEvents()
	return (
		<TldrawUiMenuGroup id="basic">
			<SignUpButton mode="modal" forceRedirectUrl="/" signInForceRedirectUrl="/">
				<TldrawUiButton
					type="normal"
					onClick={() => {
						trackEvent('open-preview-sign-up-modal', { source: 'file-menu' })
						setTimeout(hideBlueDot, 1000)
					}}
				>
					<PreviewBlueDot style={{ marginRight: 6 }} />
					<TldrawUiButtonLabel>Preview the new tldraw.com</TldrawUiButtonLabel>
				</TldrawUiButton>
			</SignUpButton>
		</TldrawUiMenuGroup>
	)
}
