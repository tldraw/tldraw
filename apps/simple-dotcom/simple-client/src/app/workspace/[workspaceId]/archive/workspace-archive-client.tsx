'use client'

import { Document, Workspace } from '@/lib/api/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface WorkspaceArchiveClientProps {
	workspace: Workspace
	archivedDocuments: Document[]
	isOwner: boolean
}

export default function WorkspaceArchiveClient({
	workspace,
	archivedDocuments,
	isOwner,
}: WorkspaceArchiveClientProps) {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [processingId, setProcessingId] = useState<string | null>(null)

	const handleRestore = async (documentId: string) => {
		setError(null)
		setSuccess(null)
		setProcessingId(documentId)

		try {
			const res = await fetch(`/api/documents/${documentId}/restore`, {
				method: 'POST',
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to restore document')
			}

			setSuccess('Document restored')
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setProcessingId(null)
		}
	}

	const handlePermanentDelete = async (documentId: string) => {
		if (!confirm('Permanently delete this document? This action cannot be undone!')) {
			return
		}

		setError(null)
		setSuccess(null)
		setProcessingId(documentId)

		try {
			const res = await fetch(`/api/documents/${documentId}/delete`, {
				method: 'DELETE',
				headers: {
					'X-Confirm-Delete': 'true',
				},
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to delete document')
			}

			setSuccess('Document permanently deleted')
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setProcessingId(null)
		}
	}

	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<header className="border-b px-6 py-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Archive</h1>
						<p className="text-sm text-gray-600">{workspace.name}</p>
					</div>
					<Link
						href={`/workspace/${workspace.id}`}
						className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
					>
						Back to Workspace
					</Link>
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto p-6">
				<div className="mx-auto max-w-4xl space-y-6">
					{error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}
					{success && (
						<div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">{success}</div>
					)}

					<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
						<p className="text-sm text-blue-800">
							Archived documents are hidden from your workspace. You can restore them or permanently
							delete them here.
						</p>
					</div>

					{archivedDocuments.length === 0 ? (
						<div className="rounded-lg border border-dashed p-12 text-center">
							<p className="text-gray-500">No archived documents</p>
							<p className="mt-2 text-sm text-gray-400">Documents you archive will appear here</p>
						</div>
					) : (
						<div className="space-y-3">
							{archivedDocuments.map((doc) => {
								const isProcessing = processingId === doc.id

								return (
									<div
										key={doc.id}
										className="flex items-center justify-between rounded-lg border p-4"
									>
										<div className="flex-1">
											<h3 className="font-medium">{doc.name}</h3>
											<p className="text-xs text-gray-500">
												Archived on {new Date(doc.updated_at).toLocaleDateString()}
											</p>
										</div>

										<div className="flex gap-2">
											<button
												onClick={() => handleRestore(doc.id)}
												disabled={isProcessing}
												className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
											>
												{isProcessing ? 'Processing...' : 'Restore'}
											</button>
											{isOwner && (
												<button
													onClick={() => handlePermanentDelete(doc.id)}
													disabled={isProcessing}
													className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
												>
													Delete Forever
												</button>
											)}
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			</main>
		</div>
	)
}
