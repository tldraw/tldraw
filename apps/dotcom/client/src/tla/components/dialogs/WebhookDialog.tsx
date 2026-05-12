import { useAuth } from '@clerk/clerk-react'
import { fetch, safeParseUrl, uniqueId } from '@tldraw/utils'
import classnames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { copyTextToClipboard } from '../../utils/copy'
import { defineMessages, F, useIntl, useMsg } from '../../utils/i18n'
import styles from './dialogs.module.css'

const messages = defineMessages({
	title: { defaultMessage: 'Webhook' },
	saveFailed: { defaultMessage: 'Failed to save webhook' },
	copySecretLead: { defaultMessage: 'Copy signing secret now' },
	shownOnce: { defaultMessage: '(shown once)' },
	dismiss: { defaultMessage: 'Dismiss' },
	webhookUrl: { defaultMessage: 'Webhook URL' },
	placeholder: { defaultMessage: 'https://…' },
	add: { defaultMessage: 'Add' },
	cancel: { defaultMessage: 'Cancel' },
	addWebhook: { defaultMessage: '+ Add webhook' },
	close: { defaultMessage: 'Close' },
	remove: { defaultMessage: 'Remove' },
	invalidWebhookUrl: { defaultMessage: 'Enter a valid URL' },
	webhookUrlMustBeHttpOrHttps: {
		defaultMessage: 'URL must start with http:// or https://',
	},
	signingSecretInputLabel: { defaultMessage: 'Signing secret' },
	copySecretTooltip: { defaultMessage: 'Copy signing secret' },
	secretCopiedTooltip: { defaultMessage: 'Copied' },
})

interface WebhookRow {
	id: string
	fileId: string
	url: string
	createdAt: number
}

interface DraftRow {
	draftId: string
	url: string
}

function getWebhookUrlProtocolIssue(trimmed: string): 'invalid' | 'protocol' | null {
	const parsed = safeParseUrl(trimmed)
	if (!parsed || !parsed.hostname) return 'invalid'
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'protocol'
	return null
}

function WebhookSigningSecretCallout({ secret, onDismiss }: { secret: string; onDismiss(): void }) {
	const intl = useIntl()
	const [copied, setCopied] = useState(false)
	const copiedTimerRef = useRef<number | undefined>(undefined)

	useEffect(() => {
		return () => {
			if (copiedTimerRef.current !== undefined) {
				clearTimeout(copiedTimerRef.current)
			}
		}
	}, [])

	const copySecret = useCallback(async () => {
		try {
			await copyTextToClipboard(secret)
			setCopied(true)
			if (copiedTimerRef.current !== undefined) {
				clearTimeout(copiedTimerRef.current)
			}
			copiedTimerRef.current = window.setTimeout(() => {
				setCopied(false)
				copiedTimerRef.current = undefined
			}, 2000)
		} catch {
			// Clipboard can fail in insecure contexts; input remains selectable.
		}
	}, [secret])

	return (
		<div
			style={{
				marginBottom: 12,
				padding: 8,
				background: 'var(--color-muted-2)',
				borderRadius: 4,
				fontSize: 12,
			}}
		>
			<div style={{ marginBottom: 8 }}>
				<strong>
					<F {...messages.copySecretLead} />
				</strong>{' '}
				<F {...messages.shownOnce} />
			</div>
			<div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
				<input
					readOnly
					value={secret}
					title={secret}
					onClick={(e) => {
						e.currentTarget.select()
						void copySecret()
					}}
					className={classnames('tlui-input', styles.dialogInput, styles.dialogInputTruncate)}
					style={{
						flex: 1,
						minWidth: 0,
						fontSize: 11,
						lineHeight: 1.3,
						fontFamily: 'var(--tl-font-mono, ui-monospace, monospace)',
						cursor: 'pointer',
						userSelect: 'text',
					}}
					aria-label={intl.formatMessage(messages.signingSecretInputLabel)}
					spellCheck={false}
				/>
				<TldrawUiButton
					type="icon"
					title={intl.formatMessage(
						copied ? messages.secretCopiedTooltip : messages.copySecretTooltip
					)}
					onClick={() => void copySecret()}
				>
					<TldrawUiButtonIcon icon={copied ? 'clipboard-copied' : 'clipboard-copy'} small />
				</TldrawUiButton>
			</div>
			<TldrawUiButton type="normal" style={{ marginTop: 8 }} onClick={onDismiss}>
				<TldrawUiButtonLabel>
					<F {...messages.dismiss} />
				</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}

export function WebhookDialog({ fileSlug, onClose }: { fileSlug: string; onClose(): void }) {
	const auth = useAuth()
	const authRef = useRef(auth)
	authRef.current = auth

	const intl = useIntl()
	const placeholderMsg = useMsg(messages.placeholder)
	/** Rows returned from POST in this session until persistence exists. */
	const [webhooks, setWebhooks] = useState<WebhookRow[]>([])
	const [drafts, setDrafts] = useState<DraftRow[]>([])
	const [loadError, setLoadError] = useState<string | null>(null)
	const [pendingSecret, setPendingSecret] = useState<{ url: string; secret: string } | null>(null)
	const [savingDraftId, setSavingDraftId] = useState<string | null>(null)
	const [draftInputErrorByDraftId, setDraftInputErrorByDraftId] = useState<Record<string, string>>(
		{}
	)

	const addDraft = useCallback(() => {
		setDrafts((d) => [...d, { draftId: uniqueId(), url: '' }])
	}, [])

	const removeDraft = useCallback((draftId: string) => {
		setDrafts((d) => d.filter((x) => x.draftId !== draftId))
		setDraftInputErrorByDraftId((prev) => {
			const next = { ...prev }
			delete next[draftId]
			return next
		})
	}, [])

	const updateDraftUrl = useCallback((draftId: string, url: string) => {
		setDrafts((d) => d.map((row) => (row.draftId === draftId ? { ...row, url } : row)))
	}, [])

	const saveDraft = useCallback(
		async (draft: DraftRow) => {
			const trimmed = draft.url.trim()
			if (!trimmed) return

			const protocolIssue = getWebhookUrlProtocolIssue(trimmed)
			if (protocolIssue) {
				setDraftInputErrorByDraftId((prev) => ({
					...prev,
					[draft.draftId]:
						protocolIssue === 'protocol'
							? intl.formatMessage(messages.webhookUrlMustBeHttpOrHttps)
							: intl.formatMessage(messages.invalidWebhookUrl),
				}))
				return
			}

			const token = await authRef.current.getToken()
			if (!token) return

			setSavingDraftId(draft.draftId)
			try {
				const res = await fetch(`/api/app/file/${fileSlug}/webhooks`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ url: trimmed }),
				})
				if (!res.ok) {
					throw new Error(await res.text())
				}
				const body = (await res.json()) as {
					id: string
					url: string
					secret: string
					createdAt: number
				}
				removeDraft(draft.draftId)
				setLoadError(null)
				setPendingSecret({ url: body.url, secret: body.secret })
				setWebhooks((prev) => [
					...prev,
					{ id: body.id, fileId: fileSlug, url: body.url, createdAt: body.createdAt },
				])
			} catch (e: unknown) {
				setLoadError(e instanceof Error ? e.message : intl.formatMessage(messages.saveFailed))
			} finally {
				setSavingDraftId(null)
			}
		},
		[fileSlug, intl, removeDraft]
	)

	const removeSavedWebhook = useCallback((webhookId: string) => {
		setWebhooks((prev) => prev.filter((w) => w.id !== webhookId))
		setLoadError(null)
	}, [])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F {...messages.title} />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 420 }}>
				{loadError && (
					<p style={{ color: 'var(--color-warn)', marginBottom: 8, fontSize: 12 }}>{loadError}</p>
				)}
				{pendingSecret && (
					<WebhookSigningSecretCallout
						key={pendingSecret.secret}
						secret={pendingSecret.secret}
						onDismiss={() => setPendingSecret(null)}
					/>
				)}

				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{webhooks.map((wh) => {
						const savedUrlInputId = `webhook-saved-url-${wh.id}`
						const removeLabel = intl.formatMessage(messages.remove)
						return (
							<div
								key={wh.id}
								style={{
									fontSize: 12,
									display: 'flex',
									flexDirection: 'column',
									gap: 6,
								}}
							>
								<label htmlFor={savedUrlInputId} style={{ display: 'block', opacity: 0.7 }}>
									<F {...messages.webhookUrl} />
								</label>
								<div
									style={{
										display: 'flex',
										flexDirection: 'row',
										alignItems: 'center',
										gap: 8,
										minWidth: 0,
									}}
								>
									<input
										id={savedUrlInputId}
										readOnly
										value={wh.url}
										title={wh.url}
										tabIndex={-1}
										className={classnames(
											'tlui-input',
											styles.dialogInput,
											styles.dialogInputTruncate
										)}
										style={{
											flex: 1,
											minWidth: 0,
											fontSize: 12,
											cursor: 'default',
											userSelect: 'text',
										}}
										spellCheck={false}
									/>
									<TldrawUiButton
										type="icon"
										tooltip={removeLabel}
										aria-label={removeLabel}
										onClick={() => removeSavedWebhook(wh.id)}
										style={{ flexShrink: 0, color: 'var(--tl-color-danger)' }}
									>
										<TldrawUiButtonIcon small icon="cross-2" />
									</TldrawUiButton>
								</div>
							</div>
						)
					})}

					{drafts.map((draft) => {
						const inputId = `webhook-url-${draft.draftId}`
						const errId = `webhook-url-error-${draft.draftId}`
						const fieldError = draftInputErrorByDraftId[draft.draftId]
						return (
							<form
								key={draft.draftId}
								style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
								onSubmit={(e) => {
									e.preventDefault()
									const form = e.currentTarget
									if (!form.checkValidity()) {
										form.reportValidity()
										return
									}
									const raw = String(new FormData(form).get('url') ?? '')
									const trimmed = raw.trim()
									const issue = getWebhookUrlProtocolIssue(trimmed)
									if (issue) {
										setDraftInputErrorByDraftId((prev) => ({
											...prev,
											[draft.draftId]:
												issue === 'protocol'
													? intl.formatMessage(messages.webhookUrlMustBeHttpOrHttps)
													: intl.formatMessage(messages.invalidWebhookUrl),
										}))
										return
									}
									setDraftInputErrorByDraftId((prev) => {
										const next = { ...prev }
										delete next[draft.draftId]
										return next
									})
									void saveDraft({ ...draft, url: trimmed })
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<label
										htmlFor={inputId}
										style={{ display: 'block', marginBottom: 4, fontSize: 12 }}
									>
										<F {...messages.webhookUrl} />
									</label>
									<input
										id={inputId}
										name="url"
										type="url"
										required
										autoComplete="url"
										inputMode="url"
										className={classnames(
											'tlui-input',
											styles.dialogInput,
											styles.dialogInputTruncate
										)}
										value={draft.url}
										onChange={(e) => {
											updateDraftUrl(draft.draftId, e.target.value)
											setDraftInputErrorByDraftId((prev) => {
												if (!prev[draft.draftId]) return prev
												const next = { ...prev }
												delete next[draft.draftId]
												return next
											})
										}}
										placeholder={placeholderMsg}
										aria-invalid={fieldError ? true : undefined}
										aria-describedby={fieldError ? errId : undefined}
									/>
									{fieldError ? (
										<p
											id={errId}
											style={{ color: 'var(--color-warn)', marginTop: 6, fontSize: 12 }}
										>
											{fieldError}
										</p>
									) : null}
								</div>
								<TldrawUiButton
									type="primary"
									htmlButtonType="submit"
									disabled={savingDraftId === draft.draftId}
								>
									<TldrawUiButtonLabel>
										<F {...messages.add} />
									</TldrawUiButtonLabel>
								</TldrawUiButton>
								<TldrawUiButton
									type="normal"
									htmlButtonType="button"
									onClick={() => removeDraft(draft.draftId)}
								>
									<TldrawUiButtonLabel>
										<F {...messages.cancel} />
									</TldrawUiButtonLabel>
								</TldrawUiButton>
							</form>
						)
					})}
				</div>

				<div style={{ marginTop: 16 }}>
					<TldrawUiButton type="normal" onClick={addDraft}>
						<TldrawUiButtonLabel>
							<F {...messages.addWebhook} />
						</TldrawUiButtonLabel>
					</TldrawUiButton>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F {...messages.close} />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
