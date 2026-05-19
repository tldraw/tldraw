import { useAuth } from '@clerk/clerk-react'
import type { TlaFileWebhookEventType, TlaFileWebhookFilter } from '@tldraw/dotcom-shared'
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
	loadingWebhooks: { defaultMessage: 'Loading webhooks…' },
	loadWebhooksFailed: { defaultMessage: 'Failed to load webhooks' },
	deleteWebhookFailed: { defaultMessage: 'Failed to delete webhook' },
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
	eventType: { defaultMessage: 'Event type' },
	eventShapeCreated: { defaultMessage: 'Shape created' },
	eventShapeUpdated: { defaultMessage: 'Shape updated' },
	eventShapeDeleted: { defaultMessage: 'Shape deleted' },
	filterPathsLabel: {
		defaultMessage: 'Property paths (one per line)',
	},
	filterPathsRequired: {
		defaultMessage: 'Add at least one property path for this event type.',
	},
	filterPathsTooMany: {
		defaultMessage: 'At most {max} paths (one per line).',
	},
	filterPathTooLong: {
		defaultMessage: 'Each path must be at most {max} characters.',
	},
})

const WEBHOOK_EVENT_TYPES: TlaFileWebhookEventType[] = [
	'shape.created',
	'shape.updated',
	'shape.deleted',
]

const MAX_FILTER_PATHS = 20
const MAX_FILTER_PATH_LENGTH = 200

async function readErrorMessageFromResponse(res: Response): Promise<string> {
	const text = await res.text()
	try {
		const j = JSON.parse(text) as { message?: string }
		if (typeof j.message === 'string' && j.message.length > 0) {
			return j.message
		}
	} catch {
		// not JSON
	}
	return text.length > 0 ? text : `Request failed (${res.status})`
}

function parseFilterPathsText(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
}

function webhookEventTypeLabel(
	intl: {
		formatMessage(descriptor: { defaultMessage: string }): string
	},
	eventType: TlaFileWebhookEventType
): string {
	switch (eventType) {
		case 'shape.created':
			return intl.formatMessage(messages.eventShapeCreated)
		case 'shape.updated':
			return intl.formatMessage(messages.eventShapeUpdated)
		case 'shape.deleted':
			return intl.formatMessage(messages.eventShapeDeleted)
		default:
			return eventType
	}
}

interface WebhookRow {
	id: string
	fileId: string
	url: string
	eventType: TlaFileWebhookEventType
	filter: TlaFileWebhookFilter | null
	createdAt: number
}

interface DraftRow {
	draftId: string
	url: string
	eventType: TlaFileWebhookEventType
	filterPaths: string
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
	const loadingWebhooksMsg = useMsg(messages.loadingWebhooks)
	const [webhooks, setWebhooks] = useState<WebhookRow[]>([])
	const [listLoading, setListLoading] = useState(true)
	const [drafts, setDrafts] = useState<DraftRow[]>([])
	const [loadError, setLoadError] = useState<string | null>(null)
	const [pendingSecret, setPendingSecret] = useState<{ url: string; secret: string } | null>(null)
	const [savingDraftId, setSavingDraftId] = useState<string | null>(null)
	const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null)
	const [draftInputErrorByDraftId, setDraftInputErrorByDraftId] = useState<Record<string, string>>(
		{}
	)

	useEffect(() => {
		let cancelled = false
		void (async () => {
			setListLoading(true)
			setLoadError(null)
			try {
				const token = await authRef.current.getToken()
				if (!token) {
					if (!cancelled) {
						setWebhooks([])
						setListLoading(false)
					}
					return
				}
				const res = await fetch(`/api/app/file/${fileSlug}/webhooks`, {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (!res.ok) {
					throw new Error(await readErrorMessageFromResponse(res))
				}
				const body = (await res.json()) as {
					error?: boolean
					webhooks?: WebhookRow[]
				}
				if (body.error || !Array.isArray(body.webhooks)) {
					throw new Error(intl.formatMessage(messages.loadWebhooksFailed))
				}
				if (!cancelled) {
					setWebhooks(
						body.webhooks.map((w) => ({
							...w,
							fileId: w.fileId ?? fileSlug,
						}))
					)
				}
			} catch (e: unknown) {
				if (!cancelled) {
					setLoadError(
						e instanceof Error ? e.message : intl.formatMessage(messages.loadWebhooksFailed)
					)
					setWebhooks([])
				}
			} finally {
				if (!cancelled) {
					setListLoading(false)
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [fileSlug, intl])

	const addDraft = useCallback(() => {
		setDrafts((d) => [
			...d,
			{ draftId: uniqueId(), url: '', eventType: 'shape.created', filterPaths: '' },
		])
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

	const updateDraftEventType = useCallback(
		(draftId: string, eventType: TlaFileWebhookEventType) => {
			setDrafts((d) =>
				d.map((row) =>
					row.draftId !== draftId
						? row
						: {
								...row,
								eventType,
								filterPaths: eventType === 'shape.updated' ? row.filterPaths : '',
							}
				)
			)
		},
		[]
	)

	const updateDraftFilterPaths = useCallback((draftId: string, filterPaths: string) => {
		setDrafts((d) => d.map((row) => (row.draftId === draftId ? { ...row, filterPaths } : row)))
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

			let filter: TlaFileWebhookFilter | undefined
			if (draft.eventType === 'shape.updated') {
				const paths = parseFilterPathsText(draft.filterPaths)
				if (paths.length === 0) {
					setDraftInputErrorByDraftId((prev) => ({
						...prev,
						[draft.draftId]: intl.formatMessage(messages.filterPathsRequired),
					}))
					return
				}
				if (paths.length > MAX_FILTER_PATHS) {
					setDraftInputErrorByDraftId((prev) => ({
						...prev,
						[draft.draftId]: intl.formatMessage(messages.filterPathsTooMany, {
							max: MAX_FILTER_PATHS,
						}),
					}))
					return
				}
				if (paths.some((p) => p.length > MAX_FILTER_PATH_LENGTH)) {
					setDraftInputErrorByDraftId((prev) => ({
						...prev,
						[draft.draftId]: intl.formatMessage(messages.filterPathTooLong, {
							max: MAX_FILTER_PATH_LENGTH,
						}),
					}))
					return
				}
				filter = { paths }
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
					body: JSON.stringify({
						url: trimmed,
						eventType: draft.eventType,
						...(filter ? { filter } : {}),
					}),
				})
				if (!res.ok) {
					throw new Error(await readErrorMessageFromResponse(res))
				}
				const body = (await res.json()) as {
					id: string
					url: string
					secret: string
					eventType: TlaFileWebhookEventType
					filter: TlaFileWebhookFilter | null
					createdAt: number
				}
				removeDraft(draft.draftId)
				setLoadError(null)
				setPendingSecret({ url: body.url, secret: body.secret })
				setWebhooks((prev) => [
					...prev,
					{
						id: body.id,
						fileId: fileSlug,
						url: body.url,
						eventType: body.eventType,
						filter: body.filter,
						createdAt: body.createdAt,
					},
				])
			} catch (e: unknown) {
				setLoadError(e instanceof Error ? e.message : intl.formatMessage(messages.saveFailed))
			} finally {
				setSavingDraftId(null)
			}
		},
		[fileSlug, intl, removeDraft]
	)

	const removeSavedWebhook = useCallback(
		async (webhookId: string) => {
			setDeletingWebhookId(webhookId)
			setLoadError(null)
			try {
				const token = await authRef.current.getToken()
				if (!token) return

				const res = await fetch(
					`/api/app/file/${fileSlug}/webhooks/${encodeURIComponent(webhookId)}`,
					{
						method: 'DELETE',
						headers: { Authorization: `Bearer ${token}` },
					}
				)
				if (res.status === 404) {
					setWebhooks((prev) => prev.filter((w) => w.id !== webhookId))
					return
				}
				if (!res.ok) {
					throw new Error(await readErrorMessageFromResponse(res))
				}
				setWebhooks((prev) => prev.filter((w) => w.id !== webhookId))
			} catch (e: unknown) {
				setLoadError(
					e instanceof Error ? e.message : intl.formatMessage(messages.deleteWebhookFailed)
				)
			} finally {
				setDeletingWebhookId(null)
			}
		},
		[fileSlug, intl]
	)

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F {...messages.title} />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.webhookDialogBody}>
				{listLoading && (
					<p style={{ opacity: 0.75, marginBottom: 10, fontSize: 12 }}>{loadingWebhooksMsg}</p>
				)}
				{loadError && (
					<div
						role="alert"
						tabIndex={0}
						className={styles.dialogSelectableError}
						onMouseDown={(e) => e.stopPropagation()}
					>
						{loadError}
					</div>
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
						const savedEventInputId = `webhook-saved-event-${wh.id}`
						const savedPathsInputId = `webhook-saved-paths-${wh.id}`
						const removeLabel = intl.formatMessage(messages.remove)
						const filterPaths = wh.filter?.paths
						return (
							<div
								key={wh.id}
								style={{
									fontSize: 12,
									display: 'flex',
									flexDirection: 'column',
									gap: 8,
								}}
							>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: 'minmax(0, 1fr) 220px auto',
										gridTemplateRows: 'auto auto',
										columnGap: 12,
										rowGap: 6,
										alignItems: 'start',
										minWidth: 0,
									}}
								>
									<label
										htmlFor={savedUrlInputId}
										style={{ gridColumn: 1, gridRow: 1, opacity: 0.7, justifySelf: 'stretch' }}
									>
										<F {...messages.webhookUrl} />
									</label>
									<label
										htmlFor={savedEventInputId}
										style={{ gridColumn: 2, gridRow: 1, opacity: 0.7, justifySelf: 'stretch' }}
									>
										<F {...messages.eventType} />
									</label>
									<span style={{ gridColumn: 3, gridRow: 1 }} aria-hidden />
									<input
										id={savedUrlInputId}
										disabled
										value={wh.url}
										title={wh.url}
										tabIndex={-1}
										className={classnames(
											'tlui-input',
											styles.dialogInput,
											styles.dialogInputTruncate,
											styles.webhookSavedField
										)}
										style={{
											gridColumn: 1,
											gridRow: 2,
											width: '100%',
											minWidth: 0,
											fontSize: 12,
										}}
										spellCheck={false}
									/>
									<input
										id={savedEventInputId}
										disabled
										value={webhookEventTypeLabel(intl, wh.eventType)}
										title={wh.eventType}
										tabIndex={-1}
										className={classnames(
											'tlui-input',
											styles.dialogInput,
											styles.dialogInputTruncate,
											styles.webhookSavedField
										)}
										style={{
											gridColumn: 2,
											gridRow: 2,
											width: '100%',
											fontSize: 12,
										}}
										spellCheck={false}
									/>
									<div
										style={{
											gridColumn: 3,
											gridRow: 2,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											alignSelf: 'stretch',
										}}
									>
										<TldrawUiButton
											type="icon"
											tooltip={removeLabel}
											aria-label={removeLabel}
											disabled={deletingWebhookId === wh.id}
											onClick={() => void removeSavedWebhook(wh.id)}
											style={{ flexShrink: 0, color: 'var(--tl-color-danger)' }}
										>
											<TldrawUiButtonIcon small icon="cross-2" />
										</TldrawUiButton>
									</div>
								</div>
								{filterPaths && filterPaths.length > 0 ? (
									<>
										<label htmlFor={savedPathsInputId} style={{ display: 'block', opacity: 0.7 }}>
											<F {...messages.filterPathsLabel} />
										</label>
										<textarea
											id={savedPathsInputId}
											disabled
											value={filterPaths.join('\n')}
											title={filterPaths.join('\n')}
											tabIndex={-1}
											className={classnames(styles.dialogFilterPaths, styles.webhookSavedTextarea)}
											rows={Math.min(6, Math.max(2, filterPaths.length))}
											spellCheck={false}
										/>
									</>
								) : null}
							</div>
						)
					})}

					{drafts.map((draft) => {
						const eventTypeId = `webhook-event-${draft.draftId}`
						const inputId = `webhook-url-${draft.draftId}`
						const filterPathsId = `webhook-filter-paths-${draft.draftId}`
						const errId = `webhook-url-error-${draft.draftId}`
						const fieldError = draftInputErrorByDraftId[draft.draftId]
						return (
							<form
								key={draft.draftId}
								style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
								onSubmit={(e) => {
									e.preventDefault()
									const form = e.currentTarget
									if (!form.checkValidity()) {
										form.reportValidity()
										return
									}
									const raw = String(new FormData(form).get('url') ?? '')
									const trimmed = raw.trim()
									setDraftInputErrorByDraftId((prev) => {
										const next = { ...prev }
										delete next[draft.draftId]
										return next
									})
									void saveDraft({ ...draft, url: trimmed })
								}}
							>
								<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
									<div
										style={{
											display: 'flex',
											flexDirection: 'row',
											gap: 12,
											alignItems: 'flex-start',
											minWidth: 0,
										}}
									>
										<div style={{ flex: '1 1 0', minWidth: 0 }}>
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
										</div>
										<div
											style={{
												flex: '0 0 220px',
												width: 220,
												minWidth: 0,
											}}
										>
											<label
												htmlFor={eventTypeId}
												style={{
													display: 'block',
													marginBottom: 4,
													fontSize: 12,
													opacity: 0.9,
												}}
											>
												<F {...messages.eventType} />
											</label>
											<select
												id={eventTypeId}
												value={draft.eventType}
												className={classnames('tlui-input', styles.dialogInput)}
												style={{ width: '100%', fontSize: 12, cursor: 'pointer' }}
												onChange={(e) => {
													updateDraftEventType(
														draft.draftId,
														e.target.value as TlaFileWebhookEventType
													)
													setDraftInputErrorByDraftId((prev) => {
														if (!prev[draft.draftId]) return prev
														const next = { ...prev }
														delete next[draft.draftId]
														return next
													})
												}}
											>
												{WEBHOOK_EVENT_TYPES.map((et) => (
													<option key={et} value={et}>
														{webhookEventTypeLabel(intl, et)}
													</option>
												))}
											</select>
										</div>
									</div>
									{draft.eventType === 'shape.updated' ? (
										<div>
											<label
												htmlFor={filterPathsId}
												style={{ display: 'block', marginBottom: 4, fontSize: 12 }}
											>
												<F {...messages.filterPathsLabel} />
											</label>
											<textarea
												id={filterPathsId}
												value={draft.filterPaths}
												className={styles.dialogFilterPaths}
												rows={4}
												spellCheck={false}
												onChange={(e) => {
													updateDraftFilterPaths(draft.draftId, e.target.value)
													setDraftInputErrorByDraftId((prev) => {
														if (!prev[draft.draftId]) return prev
														const next = { ...prev }
														delete next[draft.draftId]
														return next
													})
												}}
											/>
										</div>
									) : null}
									{fieldError ? (
										<div
											id={errId}
											role="alert"
											tabIndex={0}
											className={styles.dialogSelectableError}
											onMouseDown={(e) => e.stopPropagation()}
										>
											{fieldError}
										</div>
									) : null}
								</div>
								<div
									style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}
								>
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
								</div>
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
