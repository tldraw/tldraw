import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import { TlaWhatsNewDialogContent } from '../../tla/components/TlaWhatsNew/TlaWhatsNewDialogContent'
import { TlaWhatsNewPageEntry } from '../../tla/components/TlaWhatsNew/TlaWhatsNewPageEntry'
import { parseDateOnly } from '../../tla/utils/dates'
import styles from '../admin.module.css'

function WhatsNewImageGallery({
	imageList,
	loadingImages,
	onLoadImages,
	onDeleteImage,
}: {
	imageList: Array<{ name: string; objectName: string; url: string; uploaded?: Date }>
	loadingImages: boolean
	onLoadImages: () => void
	onDeleteImage: (objectName: string) => void
}) {
	const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)

	const copyMarkdownToClipboard = (url: string) => {
		const markdown = `![description](${url})`
		navigator.clipboard.writeText(markdown)
	}

	// Sort by upload date descending
	const sortedImageList = [...imageList].sort((a, b) => {
		if (!a.uploaded || !b.uploaded) return 0
		return new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime()
	})

	return (
		<div className={styles.fileOperation}>
			<h4 className="tla-text_ui__medium">Image gallery</h4>
			<p className="tla-text_ui__small">All uploaded What&apos;s New images</p>

			{imageList.length === 0 && !loadingImages && (
				<TlaButton type="button" variant="primary" onClick={onLoadImages}>
					Load images
				</TlaButton>
			)}

			{loadingImages && <p className="tla-text_ui__small">Loading images...</p>}

			{!loadingImages && imageList.length > 0 && sortedImageList.length === 0 && (
				<p className="tla-text_ui__small" style={{ color: 'var(--tla-color-text-3)' }}>
					No images uploaded yet
				</p>
			)}

			{sortedImageList.length > 0 && (
				<div className={styles.imageGalleryContainer}>
					{sortedImageList.map((image) => (
						<div key={image.url} className={styles.imageGalleryItem}>
							<div className={styles.imageGalleryThumbnailWrapper}>
								<img
									src={image.url}
									alt={image.name}
									className={styles.imageGalleryThumbnail}
									onClick={() => setViewingImageUrl(image.url)}
								/>
							</div>
							<div className={styles.imageGalleryInfo}>
								<div className={styles.imageGalleryName}>{image.name}</div>
								{image.uploaded && (
									<div>
										{new Date(image.uploaded).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
										})}
									</div>
								)}
							</div>
							<div className={styles.imageGalleryActions}>
								<TlaButton
									type="button"
									variant="secondary"
									onClick={() => copyMarkdownToClipboard(image.url)}
									style={{ fontSize: '12px', padding: '6px 12px' }}
								>
									Copy markdown
								</TlaButton>
								<TlaButton
									type="button"
									variant="warning"
									onClick={() => onDeleteImage(image.objectName)}
									className={styles.deleteButton}
									style={{ fontSize: '12px', padding: '6px 12px' }}
								>
									Delete
								</TlaButton>
							</div>
						</div>
					))}
				</div>
			)}

			{viewingImageUrl && (
				<div className={styles.imageViewerBackdrop} onClick={() => setViewingImageUrl(null)}>
					<img
						src={viewingImageUrl}
						alt="Full size preview"
						className={styles.imageViewerImage}
						onClick={(e) => e.stopPropagation()}
					/>
				</div>
			)}
		</div>
	)
}

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
	onImageUploaded,
}: {
	entry: WhatsNewEntryDraft
	onSave(entry: WhatsNewEntry): void
	onCancel(): void
	onImageUploaded?: () => void
}) {
	const [formData, setFormData] = useState<WhatsNewEntryDraft>(entry)
	const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadError, setUploadError] = useState<string | null>(null)

	const uploadImage = async (file: File): Promise<string> => {
		const res = await fetch('/api/app/admin/whats-new/upload-image', {
			method: 'POST',
			body: file,
			headers: {
				'Content-Type': file.type,
			},
		})

		if (!res.ok) throw new Error(await res.text())

		const { url } = await res.json()
		return url
	}

	const handleFileSelect = async (e: any) => {
		const file = e.target.files?.[0]
		if (!file) return

		setUploading(true)
		setUploadError(null)

		try {
			const url = await uploadImage(file)
			setLastUploadedUrl(url)
			onImageUploaded?.()
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : 'Upload failed')
		} finally {
			setUploading(false)
			// Reset input to allow uploading the same file again
			e.target.value = ''
		}
	}

	const copyMarkdownToClipboard = () => {
		if (lastUploadedUrl) {
			const markdown = `![description](${lastUploadedUrl})`
			navigator.clipboard.writeText(markdown)
		}
	}

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
							Shown in dialog popup. Supports **bold**, *italic*, [links](url), lists, `code`, and
							images: ![alt](url)
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
							used. Supports markdown including images.
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

					<div className={styles.formField}>
						<label>Upload image:</label>
						<div className={styles.markdownHelper}>
							Upload image, copy markdown code, paste into description
						</div>
						<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
							<input
								type="file"
								accept="image/*"
								onChange={handleFileSelect}
								disabled={uploading}
								style={{ display: 'none' }}
								id="image-upload"
							/>
							<TlaButton
								type="button"
								variant="secondary"
								disabled={uploading}
								onClick={() => document.getElementById('image-upload')?.click()}
							>
								{uploading ? 'Uploading...' : 'Upload image'}
							</TlaButton>
							<TlaButton
								type="button"
								variant="secondary"
								disabled={!lastUploadedUrl}
								onClick={() => copyMarkdownToClipboard()}
							>
								Copy markdown
							</TlaButton>
						</div>
						{uploadError && <div className={styles.errorMessage}>{uploadError}</div>}
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
	const [imageList, setImageList] = useState<
		Array<{ name: string; objectName: string; url: string; uploaded?: Date }>
	>([])
	const [loadingImages, setLoadingImages] = useState(false)

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

	const loadImageList = useCallback(async () => {
		setLoadingImages(true)
		try {
			const res = await fetch('/api/app/admin/whats-new/list-images')
			if (!res.ok) throw new Error('Failed to load images')
			const data = await res.json()
			setImageList(data)
		} catch (err) {
			console.error('Failed to fetch images:', err)
		} finally {
			setLoadingImages(false)
		}
	}, [])

	const deleteImage = useCallback(async (objectName: string) => {
		if (!window.confirm('Delete this image?')) return

		try {
			const res = await fetch('/api/app/admin/whats-new/delete-image', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ objectName }),
			})

			const result = await res.json()

			if (!res.ok || !result.success) {
				if (result.usedIn && result.usedIn.length > 0) {
					const usageList = result.usedIn.join('\n• ')
					alert(
						`Cannot delete image - it's still being used in:\n\n• ${usageList}\n\nRemove the image from these entries before deleting.`
					)
				} else {
					alert(`Failed to delete image: ${result.error || 'Unknown error'}`)
				}
				return
			}

			// Remove from local state
			setImageList((prev) => prev.filter((img) => img.objectName !== objectName))
		} catch (err) {
			console.error('Failed to delete image:', err)
			alert('Failed to delete image')
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
					onClick={() => {
						const today = new Date()
						// Store as UTC midnight ISO string
						const dateOnly = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
						setEditingEntry({
							version: getNextMajorVersion(entries),
							title: '',
							date: new Date(dateOnly).toISOString(),
							description: '',
							priority: 'regular',
						})
					}}
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
						onImageUploaded={loadImageList}
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
										{parseDateOnly(entry.date).toLocaleDateString('en-US', {
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

			<WhatsNewImageGallery
				imageList={imageList}
				loadingImages={loadingImages}
				onLoadImages={loadImageList}
				onDeleteImage={deleteImage}
			/>
		</div>
	)
}
