import { useCallback, useEffect, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	fetch,
	useToasts,
} from 'tldraw'
import { F } from '../../utils/i18n'
import styles from './dialogs.module.css'

interface CreateApiTokenResponse {
	error?: boolean
	message?: string
	id?: string
	token?: string
	createdAt?: number
}

export function TlaApiTokenDialog({ onClose }: { onClose(): void }) {
	const [state, setState] = useState<
		{ kind: 'loading' } | { kind: 'success'; token: string } | { kind: 'error'; message: string }
	>({ kind: 'loading' })
	const toasts = useToasts()

	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				const res = await fetch('/api/app/whiteboard-tokens', { method: 'POST' })
				const json = (await res.json()) as CreateApiTokenResponse
				if (cancelled) return
				if (!res.ok || json.error || !json.token) {
					setState({
						kind: 'error',
						message: json.message ?? `Request failed (${res.status})`,
					})
					return
				}
				setState({ kind: 'success', token: json.token })
			} catch (e) {
				if (cancelled) return
				setState({ kind: 'error', message: e instanceof Error ? e.message : 'Network error' })
			}
		})()
		return () => {
			cancelled = true
		}
	}, [])

	const onCopy = useCallback(() => {
		if (state.kind !== 'success') return
		navigator.clipboard.writeText(state.token).then(() => {
			toasts.addToast({ severity: 'success', title: 'Token copied to clipboard' })
		})
	}, [state, toasts])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="API token" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody} style={{ width: 'fit-content' }}>
				{state.kind === 'loading' && (
					<p>
						<F defaultMessage="Creating token…" />
					</p>
				)}
				{state.kind === 'error' && (
					<p>
						<F
							defaultMessage="Could not create token: {message}"
							values={{ message: state.message }}
						/>
					</p>
				)}
				{state.kind === 'success' && (
					<>
						<p>
							<F defaultMessage="Copy this token. It will not be shown again." />
						</p>
						<input
							readOnly
							size={state.token.length}
							value={state.token}
							onFocus={(e) => e.currentTarget.select()}
							style={{
								fontFamily: 'monospace',
								padding: 'var(--tl-space-3) var(--tl-space-4)',
								border: '1px solid var(--tl-color-muted-2)',
								borderRadius: 'var(--tl-radius-2)',
								background: 'var(--tl-color-muted-0)',
								color: 'var(--tl-color-text-0)',
							}}
						/>
					</>
				)}
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				{state.kind === 'success' && (
					<TldrawUiButton type="normal" onClick={onCopy}>
						<TldrawUiButtonLabel>
							<F defaultMessage="Copy" />
						</TldrawUiButtonLabel>
					</TldrawUiButton>
				)}
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Close" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
