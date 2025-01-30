import { SignUpButton } from '@clerk/clerk-react'
import { CSSProperties, useEffect } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiMenuGroup,
	atom,
	getFromLocalStorage,
	setInLocalStorage,
	useDialogs,
	useValue,
} from 'tldraw'
// @ts-expect-error todo: setup ts image imports
import dotcomScreenshot from '../images/dotcom-screenshot.png'

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

export function TryTheNewTldrawDialog({ onClose }: { onClose(): void }) {
	useEffect(() => {
		setTimeout(() => {
			hideBlueDot()
		}, 1000)
	})
	return (
		<div>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle style={{ fontWeight: 700 }}>
					Try the new tldraw.com
				</TldrawUiDialogTitle>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				style={{
					maxWidth: 350,
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
					paddingTop: 0,
					paddingBottom: 0,
				}}
			>
				<p>
					Sign up to try the new version of tldraw.com, which adds file management and collaboration
					features.
				</p>
				<img src={dotcomScreenshot} alt="tldraw.com screenshot" style={{ width: '100%' }} />
			</TldrawUiDialogBody>
			<div
				style={{
					display: 'flex',
					padding: 'var(--space-1) var(--space-4)',
					justifyContent: 'flex-end',
					alignItems: 'center',
				}}
			>
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>No thanks</TldrawUiButtonLabel>
				</TldrawUiButton>
				<SignUpButton mode="modal" forceRedirectUrl="/" signInForceRedirectUrl="/">
					<button
						onClick={onClose}
						style={{
							background: 'var(--color-primary)',
							color: 'white',
							borderRadius: 4,
							border: 'none',
							height: 32,
							padding: '0px 12px',
							cursor: 'pointer',
						}}
					>
						<TldrawUiButtonLabel>Sign up</TldrawUiButtonLabel>
					</button>
				</SignUpButton>
			</div>
		</div>
	)
}

export function PreviewMenuItem() {
	const dialogs = useDialogs()
	return (
		<TldrawUiMenuGroup id="basic">
			<TldrawUiButton
				type="normal"
				onClick={() => {
					dialogs.addDialog({
						component: TryTheNewTldrawDialog,
					})
				}}
			>
				<PreviewBlueDot style={{ marginRight: 6 }} />
				<TldrawUiButtonLabel>Try the new tldraw.com</TldrawUiButtonLabel>
			</TldrawUiButton>
		</TldrawUiMenuGroup>
	)
}
