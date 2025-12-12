import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import styles from '../admin.module.css'

type WhatsNewEntryDraft =
	| (Omit<Extract<WhatsNewEntry, { items: string[] }>, 'schemaVersion'> & {
			schemaVersion?: number
	  })
	| (Omit<Extract<WhatsNewEntry, { description: string }>, 'schemaVersion'> & {
			schemaVersion?: number
	  })

function WhatsNewEntryForm({
	entry,
	onSave,
	onCancel,
}: {
	entry: WhatsNewEntryDraft
	onSave: (entry: WhatsNewEntry) => void
	onCancel: () => void
}) {
	const [formData, setFormData] = useState<WhatsNewEntryDraft>(entry)
	const [useItems, setUseItems] = useState('items' in entry && !!entry.items)

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				onSave({ ...formData, schemaVersion: 1 } as WhatsNewEntry)
			}}
			className={styles.whatsNewForm}
		>
			<div className={styles.formField}>
				<label htmlFor="version">Version (e.g., 1.0):</label>
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

			<div className={styles.formField}>
				<label>Content type:</label>
				<div className={styles.radioGroup}>
					<label>
						<input
							type="radio"
							checked={useItems}
							onChange={() => {
								setUseItems(true)
								setFormData({
									version: formData.version,
									title: formData.title,
									date: formData.date,
									items: [''],
								})
							}}
						/>
						Bullet points
					</label>
					<label>
						<input
							type="radio"
							checked={!useItems}
							onChange={() => {
								setUseItems(false)
								setFormData({
									version: formData.version,
									title: formData.title,
									date: formData.date,
									description: '',
								})
							}}
						/>
						Description
					</label>
				</div>
			</div>

			{useItems ? (
				<div className={styles.formField}>
					<label>Bullet points:</label>
					<div className={styles.bulletList}>
						{'items' in formData &&
							formData.items.map((item, i) => (
								<div key={i} className={styles.bulletItem}>
									<input
										type="text"
										value={item}
										onChange={(e) => {
											if ('items' in formData) {
												const newItems = [...formData.items]
												newItems[i] = e.target.value
												setFormData({ ...formData, items: newItems })
											}
										}}
										className={styles.searchInput}
									/>
									<TlaButton
										type="button"
										onClick={() => {
											if ('items' in formData) {
												const newItems = formData.items.filter((_, idx) => idx !== i)
												setFormData({ ...formData, items: newItems })
											}
										}}
										variant="warning"
										className={styles.deleteButton}
									>
										Remove
									</TlaButton>
								</div>
							))}
						<TlaButton
							type="button"
							onClick={() => {
								if ('items' in formData) {
									setFormData({ ...formData, items: [...formData.items, ''] })
								}
							}}
							variant="secondary"
						>
							Add Item
						</TlaButton>
					</div>
				</div>
			) : (
				<div className={styles.formField}>
					<label htmlFor="description">Description:</label>
					<textarea
						id="description"
						value={'description' in formData ? formData.description : ''}
						onChange={(e) => {
							if ('description' in formData) {
								setFormData({ ...formData, description: e.target.value })
							}
						}}
						placeholder="Description"
						rows={5}
						className={styles.searchInput}
					/>
				</div>
			)}

			<div className={styles.formActions}>
				<TlaButton type="submit" variant="primary">
					Save
				</TlaButton>
				<TlaButton type="button" onClick={onCancel} variant="secondary">
					Cancel
				</TlaButton>
			</div>
		</form>
	)
}

export function AdminWhatsNew() {
	const [entries, setEntries] = useState<WhatsNewEntry[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [editingEntry, setEditingEntry] = useState<WhatsNewEntryDraft | null>(null)

	const loadEntries = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/whats-new')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const data = await res.json()
			// API returns array directly, not wrapped in object
			setEntries(Array.isArray(data) ? data : [])
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load entries')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadEntries()
	}, [loadEntries])

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
				Manage What's New content that appears in the user settings menu.
			</p>

			{!editingEntry && (
				<TlaButton
					onClick={() =>
						setEditingEntry({
							version: '',
							title: '',
							date: new Date().toISOString(),
							items: [''],
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

			{isLoading ? (
				<p className="tla-text_ui__small">Loading...</p>
			) : (
				<div className={styles.entriesList}>
					<h4 className="tla-text_ui__medium">Existing Entries</h4>
					{!entries || entries.length === 0 ? (
						<p className="tla-text_ui__small">No entries yet</p>
					) : (
						entries.map((entry) => (
							<div key={entry.version} className={styles.entryCard}>
								<div className={styles.entryHeader}>
									<div>
										<h5 className="tla-text_ui__medium">
											{entry.version} - {entry.title}
										</h5>
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
								{'items' in entry && entry.items && (
									<ul className={styles.entryItems}>
										{entry.items.map((item, i) => (
											<li key={i}>{item}</li>
										))}
									</ul>
								)}
								{'description' in entry && entry.description && (
									<p className="tla-text_ui__small">{entry.description}</p>
								)}
							</div>
						))
					)}
				</div>
			)}
		</div>
	)
}
