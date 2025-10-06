'use client'

import DocumentMetadata from '@/components/documents/DocumentMetadata'
import { useDocumentRealtimeUpdates } from '@/hooks/useDocumentRealtimeUpdates'
import { Document, Workspace } from '@/lib/api/types'
import {
	isDocumentSharingUpdatePayload,
	type DocumentSharingUpdatePayload,
	type RealtimeEvent,
} from '@/lib/realtime/types'
import Link from 'next/link'
import { useCallback, useState } from 'react'

interface DocumentViewClientProps {
	document: Document
	workspace: Workspace
	accessType: 'member' | 'guest'
	canEdit: boolean
	userId: string | null
}

export default function DocumentViewClient({
	document,
	workspace,
	accessType,
	canEdit: initialCanEdit,
	userId,
}: DocumentViewClientProps) {
	const [sharingMode, setSharingMode] = useState(document.sharing_mode)
	const [isChangingSharing, setIsChangingSharing] = useState(false)
	const [showSharingModal, setShowSharingModal] = useState(false)

	const isMember = accessType === 'member'
	const isGuest = accessType === 'guest'

	// Recalculate canEdit based on current sharing mode
	// Members can always edit, guests can only edit if sharing_mode is public_editable
	const canEdit = isMember ? true : sharingMode === 'public_editable'

	// Subscribe to document realtime updates for permission changes
	const handleSharingUpdate = useCallback((event: RealtimeEvent) => {
		if (isDocumentSharingUpdatePayload(event.payload)) {
			const payload = event.payload as DocumentSharingUpdatePayload
			console.log('Document sharing mode updated via realtime:', payload)

			// Update local state with new sharing mode
			setSharingMode(payload.sharing_mode)

			// Close modal if open
			setShowSharingModal(false)
		}
	}, [])

	useDocumentRealtimeUpdates(document.id, {
		onSharingUpdate: handleSharingUpdate,
		enabled: true,
	})

	const handleSharingChange = async (
		newMode: 'private' | 'public_read_only' | 'public_editable'
	) => {
		setIsChangingSharing(true)

		try {
			const res = await fetch(`/api/documents/${document.id}/share`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sharing_mode: newMode }),
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to update sharing')
			}

			setSharingMode(newMode)
			setShowSharingModal(false)
		} catch (err: any) {
			alert(`Error: ${err.message}`)
		} finally {
			setIsChangingSharing(false)
		}
	}

	return (
		<div className="flex h-screen flex-col">
			{/* Header - different for members vs guests */}
			{isMember ? (
				<>
					<header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
						<div className="flex items-center gap-4">
							<Link
								href={`/workspace/${workspace.id}`}
								className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
							>
								← {workspace.name}
							</Link>
							<h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
								{document.name}
							</h1>
						</div>
						<div className="flex gap-2">
							<button
								onClick={() => setShowSharingModal(true)}
								className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
							>
								Share
							</button>
							<Link
								href="/dashboard"
								className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
							>
								Dashboard
							</Link>
						</div>
					</header>
					<DocumentMetadata document={document} />
				</>
			) : (
				<>
					<header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
						<div>
							<h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
								{document.name}
							</h1>
							<p className="text-xs text-gray-600 dark:text-gray-400">
								{canEdit ? 'Public - Editable' : 'Public - Read Only'}
							</p>
						</div>
						{!userId && (
							<div className="flex gap-2">
								<Link
									href="/login"
									className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
								>
									Sign In
								</Link>
								<Link
									href="/signup"
									className="rounded-md bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-600"
								>
									Sign Up
								</Link>
							</div>
						)}
					</header>
					<DocumentMetadata document={document} isGuest={true} />
				</>
			)}

			{/* Canvas area placeholder */}
			<main className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
				<div className="text-center">
					<div className="mb-4 text-6xl">🎨</div>
					<h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
						tldraw Canvas
					</h2>
					<p className="text-gray-600 dark:text-gray-400">
						{canEdit ? 'You can edit this document' : 'Read-only access'}
					</p>
					<p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
						Canvas integration will be implemented in COLLAB-01
					</p>
				</div>
			</main>

			{/* Sharing modal */}
			{showSharingModal && isMember && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70">
					<div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
						<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
							Sharing Settings
						</h2>

						<div className="space-y-3">
							<button
								onClick={() => handleSharingChange('private')}
								disabled={isChangingSharing}
								className={`w-full rounded-lg border p-4 text-left hover:border-blue-500 dark:hover:border-blue-400 disabled:opacity-50 ${
									sharingMode === 'private'
										? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
										: 'border-gray-200 dark:border-gray-700'
								}`}
							>
								<div className="font-semibold text-gray-900 dark:text-gray-100">Private</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">
									Only workspace members can access
								</div>
							</button>

							<button
								onClick={() => handleSharingChange('public_read_only')}
								disabled={isChangingSharing}
								className={`w-full rounded-lg border p-4 text-left hover:border-blue-500 dark:hover:border-blue-400 disabled:opacity-50 ${
									sharingMode === 'public_read_only'
										? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
										: 'border-gray-200 dark:border-gray-700'
								}`}
							>
								<div className="font-semibold text-gray-900 dark:text-gray-100">
									Public - Read Only
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">
									Anyone with the link can view
								</div>
							</button>

							<button
								onClick={() => handleSharingChange('public_editable')}
								disabled={isChangingSharing}
								className={`w-full rounded-lg border p-4 text-left hover:border-blue-500 dark:hover:border-blue-400 disabled:opacity-50 ${
									sharingMode === 'public_editable'
										? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
										: 'border-gray-200 dark:border-gray-700'
								}`}
							>
								<div className="font-semibold text-gray-900 dark:text-gray-100">
									Public - Editable
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">
									Anyone with the link can edit
								</div>
							</button>
						</div>

						<div className="mt-6 flex justify-end gap-2">
							<button
								onClick={() => setShowSharingModal(false)}
								disabled={isChangingSharing}
								className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
