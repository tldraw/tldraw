import { SignInButton } from '@clerk/clerk-react'
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
	return (
		<TldrawUiMenuGroup id="basic">
			<SignInButton mode="modal" forceRedirectUrl="/" signUpForceRedirectUrl="/">
				<TldrawUiButton
					type="normal"
					onClick={() => {
						setTimeout(hideBlueDot, 1000)
					}}
				>
					<PreviewBlueDot style={{ marginRight: 6 }} />
					<TldrawUiButtonLabel>Preview the new tldraw.com</TldrawUiButtonLabel>
				</TldrawUiButton>
			</SignInButton>
		</TldrawUiMenuGroup>
	)
}
