import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import { TlaWhatsNewDialogContent } from '../../tla/components/TlaWhatsNew/TlaWhatsNewDialogContent'
import { TlaWhatsNewPageEntry } from '../../tla/components/TlaWhatsNew/TlaWhatsNewPageEntry'
import styles from '../admin.module.css'

type WhatsNewEntryDraft = Omit<WhatsNewEntry, 'schemaVersion'> & {
	schemaVersion?: number
}

function getNextMajorVersion(entries: WhatsNewEntry[]): string {
	if (entries.length === 0) return '1.0'

	// Find the highest version number
	const versions = entries.map((e) => {
		const match = e.version.match(/^(\d+)/)
		return match ? parseInt(match[1], 10) : 0
	})
	const maxVersion = Math.max(...versions)
	return `${maxVersion + 1}.0`
}

function WhatsNewEntryForm({
	entry,
	onSave,
	onCancel,
}: {
	entry: WhatsNewEntryDraft
	onSave(entry: WhatsNewEntry): void
	onCancel(): void
}) {
	const [formData, setFormData] = useState<WhatsNewEntryDraft>(entry)

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				onSave({ ...formData, schemaVersion: 1 } as WhatsNewEntry)
			}}
			className={styles.whatsNewForm}
		>
			<div className={styles.whatsNewFormLayout}>
				<div className={styles.whatsNewFormFields}>
					<div className={styles.formField}>
						<label htmlFor="version">Version:</label>
						<input
							id="version"
							type="text"
							placeholder="1.0"
							value={formData.version}
							onChange={(e) => setFormData({ ...formData, version: e.target.value })}
							className={styles.searchInput}
							required
						/>
					</div>

					<div className={styles.formField}>
						<label htmlFor="title">Title:</label>
						<input
							id="title"
							type="text"
							placeholder="Feature title"
							value={formData.title}
							onChange={(e) => setFormData({ ...formData, title: e.target.value })}
							className={styles.searchInput}
							required
						/>
					</div>

					<div className={styles.formField}>
						<label htmlFor="date">Date:</label>
						<input
							id="date"
							type="date"
							value={formData.date.split('T')[0]}
							onChange={(e) =>
								setFormData({ ...formData, date: new Date(e.target.value).toISOString() })
							}
							className={styles.searchInput}
							required
						/>
					</div>

					{/* Short description shown in the What's New dialog popup */}
					<div className={styles.formField}>
						<label htmlFor="description">Short description:</label>
						<div className={styles.markdownHelper}>
							Shown in dialog popup. Supports **bold**, *italic*, [links](url), lists, and `code`
						</div>
						<textarea
							id="description"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							placeholder="Brief summary for dialog"
							rows={8}
							className={styles.searchInput}
							required
						/>
					</div>

					{/* Long description shown on the /whats-new page (optional) */}
					<div className={styles.formField}>
						<label htmlFor="fullDescription">Long description:</label>
						<div className={styles.markdownHelper}>
							Optional. Shown on /whats-new page with more space. If empty, short description is
							used.
						</div>
						<textarea
							id="fullDescription"
							value={formData.fullDescription || ''}
							onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
							placeholder="Detailed description for /whats-new page (optional)"
							rows={15}
							className={styles.searchInput}
						/>
					</div>

					<div className={styles.formField}>
						<label htmlFor="priority">Priority:</label>
						<div className={styles.markdownHelper}>
							Important: auto-shows dialog to all users. Regular: only shown in menu.
						</div>
						<select
							id="priority"
							value={formData.priority || 'regular'}
							onChange={(e) =>
								setFormData({ ...formData, priority: e.target.value as 'regular' | 'important' })
							}
							className={styles.searchInput}
						>
							<option value="regular">Regular</option>
							<option value="important">Important</option>
						</select>
					</div>

					<div className={styles.formActions}>
						<TlaButton type="submit" variant="primary">
							Save
						</TlaButton>
						<TlaButton type="button" onClick={onCancel} variant="secondary">
							Cancel
						</TlaButton>
					</div>
				</div>

				<div className={styles.whatsNewPreviews}>
					{/* Dialog preview - uses the same component as the actual dialog */}
					<div className={`${styles.whatsNewPreview} ${styles.whatsNewPreviewDialog}`}>
						<div className={styles.whatsNewPreviewLabel}>Dialog preview</div>
						<TlaWhatsNewDialogContent
							entry={{
								schemaVersion: 1,
								version: formData.version || '1.0',
								title: formData.title || 'Untitled',
								date: formData.date,
								description: formData.description || '*No content*',
							}}
						/>
					</div>

					{/* Page preview - uses the same component as the actual page */}
					<div className={styles.whatsNewPreview}>
						<div className={styles.whatsNewPreviewLabel}>Page preview</div>
						<TlaWhatsNewPageEntry
							entry={{
								schemaVersion: 1,
								version: formData.version || '1.0',
								title: formData.title || 'Untitled',
								date: formData.date,
								description: formData.description || '*No content*',
								fullDescription: formData.fullDescription,
							}}
						/>
					</div>
				</div>
			</div>
		</form>
	)
}

interface AdminWhatsNewProps {
	initialEntries: WhatsNewEntry[]
}

export function AdminWhatsNew({ initialEntries }: AdminWhatsNewProps) {
	const [entries, setEntries] = useState<WhatsNewEntry[]>(initialEntries)
	const [error, setError] = useState<string | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [editingEntry, setEditingEntry] = useState<WhatsNewEntryDraft | null>(null)

	const loadEntries = useCallback(async () => {
		setError(null)
		try {
			const res = await fetch('/api/app/admin/whats-new')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const data = await res.json()
			// API returns array directly, not wrapped in object
			// Sort by version in descending order
			const sorted = Array.isArray(data)
				? data.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
				: []
			setEntries(sorted)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load entries')
		}
	}, [])

	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	const saveEntry = useCallback(
		async (entry: WhatsNewEntry) => {
			setError(null)
			setSuccessMessage(null)
			try {
				const res = await fetch('/api/app/admin/whats-new', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(entry),
				})
				if (!res.ok) {
					setError(res.statusText + ': ' + (await res.text()))
					return
				}
				await loadEntries()
				setEditingEntry(null)
				setSuccessMessage('Entry saved successfully')
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to save entry')
			}
		},
		[loadEntries]
	)

	const deleteEntry = useCallback(
		async (version: string) => {
			if (!window.confirm(`Delete What's New entry ${version}?`)) {
				return
			}

			setError(null)
			setSuccessMessage(null)
			try {
				const res = await fetch(`/api/app/admin/whats-new/${version}`, {
					method: 'DELETE',
				})
				if (!res.ok) {
					setError(res.statusText + ': ' + (await res.text()))
					return
				}
				await loadEntries()
				setSuccessMessage('Entry deleted successfully')
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete entry')
			}
		},
		[loadEntries]
	)

	return (
		<div className={styles.fileOperation}>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}

			<p className="tla-text_ui__small">
				Manage What&apos;s New content that appears in the user settings menu.
			</p>

			{!editingEntry && (
				<TlaButton
					onClick={() =>
						setEditingEntry({
							version: getNextMajorVersion(entries),
							title: '',
							date: new Date().toISOString(),
							description: '',
							priority: 'regular',
						})
					}
					variant="primary"
				>
					Add New Entry
				</TlaButton>
			)}

			{editingEntry && (
				<div className={styles.editingSection}>
					<h4 className="tla-text_ui__medium">
						{editingEntry.version ? `Edit ${editingEntry.version}` : 'New Entry'}
					</h4>
					<WhatsNewEntryForm
						entry={editingEntry}
						onSave={saveEntry}
						onCancel={() => setEditingEntry(null)}
					/>
				</div>
			)}

			<div className={styles.entriesList}>
				<h4 className="tla-text_ui__medium">Existing Entries</h4>
				{!entries || entries.length === 0 ? (
					<p className="tla-text_ui__small">No entries yet</p>
				) : (
					entries.map((entry) => (
						<div key={entry.version} className={styles.entryCard}>
							<div className={styles.entryHeader}>
								<div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
										<h5 className="tla-text_ui__medium">
											{entry.version} - {entry.title}
										</h5>
										{entry.priority === 'important' && (
											<span className={styles.autoShowBadge}>IMPORTANT</span>
										)}
									</div>
									<p className="tla-text_ui__small">
										{new Date(entry.date).toLocaleDateString('en-US', {
											month: 'short',
											year: 'numeric',
										})}
									</p>
								</div>
								<div className={styles.entryActions}>
									<TlaButton onClick={() => setEditingEntry(entry)} variant="secondary">
										Edit
									</TlaButton>
									<TlaButton
										onClick={() => deleteEntry(entry.version)}
										variant="warning"
										className={styles.deleteButton}
									>
										Delete
									</TlaButton>
								</div>
							</div>
							<p className="tla-text_ui__small">{entry.description}</p>
						</div>
					))
				)}
			</div>
		</div>
	)
}
