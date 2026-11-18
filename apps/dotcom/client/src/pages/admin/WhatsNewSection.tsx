import { WHATS_NEW_MEDIA_TYPES, WhatsNewStore, WhatsNewUpdate } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaWhatsNewUpdate } from '../../tla/components/WhatsNew/TlaWhatsNewUpdate'
import { AdminButton } from './AdminButton'
import { getResponseError, useTransientMessage } from './shared'
import styles from './admin.module.css'

const API = '/api/app/admin/whats-new'
const EMPTY_FORM = { title: '', body: '' }

export function WhatsNewSection() {
	const [store, setStore] = useState<WhatsNewStore | null>(null)
	const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
	const [form, setForm] = useState(EMPTY_FORM)
	const [isBusy, setIsBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [successMessage, setSuccessMessage] = useTransientMessage()
	const bodyRef = useRef<HTMLTextAreaElement>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	const selected = store?.updates.find((u) => u.id === selectedId) ?? null
	// Publish sends no content, so publishing with unsaved edits would ship the last saved body.
	const isDirty = !!selected && (form.title !== selected.title || form.body !== selected.body)

	const load = useCallback(async () => {
		setError(null)
		const res = await fetch(API)
		if (!res.ok) return setError(await getResponseError(res))
		setStore(await res.json())
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const select = (update: WhatsNewUpdate | 'new') => {
		setSelectedId(update === 'new' ? 'new' : update.id)
		setForm(update === 'new' ? EMPTY_FORM : { title: update.title, body: update.body })
	}

	const send = async (path: string, payload: object, message: string) => {
		if (!store) return null
		setIsBusy(true)
		setError(null)
		try {
			const res = await fetch(`${API}${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ version: store.version, ...payload }),
			})
			if (res.status === 409) {
				setError("Someone else changed What's new. Reload to see their changes.")
				return null
			}
			if (!res.ok) {
				setError(await getResponseError(res))
				return null
			}
			const next: WhatsNewStore = await res.json()
			setStore(next)
			setSuccessMessage(message)
			return next
		} finally {
			setIsBusy(false)
		}
	}

	const save = async () => {
		if (selectedId === 'new') {
			const before = new Set(store?.updates.map((u) => u.id))
			const next = await send('', form, 'Draft created')
			const created = next?.updates.find((u) => !before.has(u.id))
			if (created) setSelectedId(created.id)
		} else if (selected) {
			await send(`/${selected.id}`, form, 'Saved')
		}
	}

	const remove = async () => {
		if (!selected) return
		const warning =
			selected.status === 'published'
				? ' It is published, so it will disappear for everyone on their next reload.'
				: ''
		if (!window.confirm(`Delete "${selected.title}"?${warning} This cannot be undone.`)) return
		if (await send(`/${selected.id}/delete`, {}, 'Update deleted')) {
			setSelectedId(null)
			setForm(EMPTY_FORM)
		}
	}

	const uploadMedia = async (file: File) => {
		setIsBusy(true)
		setError(null)
		try {
			const res = await fetch(`${API}/media`, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file,
			})
			if (!res.ok) return setError(await getResponseError(res))
			const { objectName } = await res.json()
			// Same-origin via the sync worker, which reads the bucket it just wrote to; the user-content
			// worker keeps separate state locally.
			const snippet = `![](/api/app/uploads/${objectName})`
			const textarea = bodyRef.current
			const start = textarea?.selectionStart ?? form.body.length
			const end = textarea?.selectionEnd ?? form.body.length
			setForm((f) => ({ ...f, body: f.body.slice(0, start) + snippet + f.body.slice(end) }))
		} finally {
			setIsBusy(false)
			if (fileRef.current) fileRef.current.value = ''
		}
	}

	const preview: WhatsNewUpdate | null =
		selectedId === null
			? null
			: {
					id: selected?.id ?? 'preview',
					status: selected?.status ?? 'draft',
					publishedAt: selected?.publishedAt ?? null,
					createdAt: selected?.createdAt ?? Date.now(),
					updatedAt: Date.now(),
					title: form.title || 'Untitled',
					body: form.body,
				}

	return (
		<section className={styles.adminSection}>
			<div className={styles.whatsNewHeader}>
				<div>
					<h3 className={styles.sectionTitle}>What&apos;s new</h3>
					<p className={styles.featureFlagsDescription}>
						Updates auto-open once for signed-in users on their next reload. Drafts are only visible
						to tldraw staff.
					</p>
				</div>
				<AdminButton variant="primary" onClick={() => select('new')} disabled={isBusy || !store}>
					New update
				</AdminButton>
			</div>
			{error && (
				<div className={styles.errorMessage} role="alert">
					{error}
				</div>
			)}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			{!store ? (
				<p className={styles.featureFlagsDescription}>Loading…</p>
			) : store.updates.length === 0 ? (
				<p className={styles.featureFlagsDescription}>No updates yet.</p>
			) : (
				<table className={styles.diagnosticsTable}>
					<thead>
						<tr>
							<th>Title</th>
							<th className={styles.whatsNewNarrowCol}>Status</th>
							<th className={styles.whatsNewNarrowCol}>Published</th>
						</tr>
					</thead>
					<tbody>
						{store.updates.map((u) => (
							<tr
								key={u.id}
								onClick={() => select(u)}
								className={
									u.id === selectedId
										? `${styles.clickableRow} ${styles.whatsNewRowSelected}`
										: styles.clickableRow
								}
							>
								<td>{u.title}</td>
								<td>
									<span
										className={
											u.status === 'published'
												? styles.whatsNewStatusPublished
												: styles.whatsNewStatusDraft
										}
									>
										{u.status === 'published' ? 'Published' : 'Draft'}
									</span>
								</td>
								<td>{u.publishedAt ? new Date(u.publishedAt).toLocaleDateString() : '—'}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
			{selectedId !== null && (
				<div className={styles.whatsNewEditor}>
					<div className={styles.whatsNewForm}>
						<label className={styles.whatsNewField}>
							<span className={styles.fieldLabel}>Title</span>
							<input
								className={styles.whatsNewInput}
								placeholder="Comments are here"
								value={form.title}
								onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
							/>
						</label>
						<label className={styles.whatsNewField}>
							<span className={styles.fieldLabel}>Body (markdown)</span>
							<textarea
								ref={bodyRef}
								className={styles.whatsNewBody}
								placeholder="Markdown body"
								value={form.body}
								onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
							/>
						</label>
						<input
							ref={fileRef}
							type="file"
							hidden
							accept={Object.keys(WHATS_NEW_MEDIA_TYPES).join(',')}
							onChange={(e) => {
								const file = e.target.files?.[0]
								if (file) uploadMedia(file)
							}}
						/>
						<div className={styles.whatsNewActions}>
							<AdminButton onClick={() => fileRef.current?.click()} disabled={isBusy}>
								Upload media
							</AdminButton>
							<div className={styles.whatsNewActionsEnd}>
								{selected && (
									<AdminButton
										variant="danger"
										className={styles.whatsNewDelete}
										onClick={remove}
										disabled={isBusy}
									>
										Delete
									</AdminButton>
								)}
								{selected?.status === 'published' && (
									<AdminButton
										onClick={() => send(`/${selected.id}/unpublish`, {}, 'Unpublished')}
										disabled={isBusy || isDirty}
										title={isDirty ? 'Save first' : undefined}
									>
										Unpublish
									</AdminButton>
								)}
								{selected?.status === 'draft' && (
									<AdminButton
										onClick={() => send(`/${selected.id}/publish`, {}, 'Published')}
										disabled={isBusy || isDirty}
										title={isDirty ? 'Save first' : undefined}
									>
										Publish
									</AdminButton>
								)}
								<AdminButton
									variant="primary"
									onClick={save}
									isLoading={isBusy}
									disabled={selectedId !== 'new' && !isDirty}
								>
									{selectedId === 'new' ? 'Create draft' : 'Save'}
								</AdminButton>
							</div>
						</div>
					</div>
					<div className={styles.whatsNewField}>
						<span className={styles.fieldLabel}>Preview</span>
						<div className={styles.whatsNewPreview}>
							{preview && <TlaWhatsNewUpdate update={preview} />}
						</div>
					</div>
				</div>
			)}
		</section>
	)
}
