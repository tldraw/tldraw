'use client'

import { Document, Workspace } from '@/lib/api/types'
import Link from 'next/link'
import { useState } from 'react'

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
	canEdit,
	userId,
}: DocumentViewClientProps) {
	const [sharingMode, setSharingMode] = useState(document.sharing_mode)
	const [isChangingSharing, setIsChangingSharing] = useState(false)
	const [showSharingModal, setShowSharingModal] = useState(false)

	const isMember = accessType === 'member'
	const isGuest = accessType === 'guest'

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
				<header className="flex items-center justify-between border-b px-6 py-4">
					<div className="flex items-center gap-4">
						<Link
							href={`/workspace/${workspace.id}`}
							className="text-sm text-gray-600 hover:text-gray-900"
						>
							← {workspace.name}
						</Link>
						<h1 className="text-xl font-bold">{document.name}</h1>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => setShowSharingModal(true)}
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Share
						</button>
						<Link
							href="/dashboard"
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Dashboard
						</Link>
					</div>
				</header>
			) : (
				<header className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
					<div>
						<h1 className="text-xl font-bold">{document.name}</h1>
						<p className="text-xs text-gray-600">
							{canEdit ? 'Public - Editable' : 'Public - Read Only'}
						</p>
					</div>
					{!userId && (
						<div className="flex gap-2">
							<Link
								href="/login"
								className="rounded-md border bg-white px-4 py-2 text-sm hover:bg-gray-50"
							>
								Sign In
							</Link>
							<Link
								href="/signup"
								className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
							>
								Sign Up
							</Link>
						</div>
					)}
				</header>
			)}

			{/* Canvas area placeholder */}
			<main className="flex flex-1 items-center justify-center bg-gray-100">
				<div className="text-center">
					<div className="mb-4 text-6xl">🎨</div>
					<h2 className="mb-2 text-2xl font-bold">tldraw Canvas</h2>
					<p className="text-gray-600">
						{canEdit ? 'You can edit this document' : 'Read-only access'}
					</p>
					<p className="mt-4 text-sm text-gray-500">
						Canvas integration will be implemented in COLLAB-01
					</p>
				</div>
			</main>

			{/* Sharing modal */}
			{showSharingModal && isMember && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
					<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
						<h2 className="mb-4 text-xl font-bold">Sharing Settings</h2>

						<div className="space-y-3">
							<button
								onClick={() => handleSharingChange('private')}
								disabled={isChangingSharing}
								className={`w-full rounded-lg border p-4 text-left hover:border-blue-500 disabled:opacity-50 ${
									sharingMode === 'private' ? 'border-blue-500 bg-blue-50' : ''
								}`}
							>
								<div className="font-semibold">Private</div>
								<div className="text-sm text-gray-600">Only workspace members can access</div>
							</button>

							<button
								onClick={() => handleSharingChange('public_read_only')}
								disabled={isChangingSharing}
								className={`w-full rounded-lg border p-4 text-left hover:border-blue-500 disabled:opacity-50 ${
									sharingMode === 'public_read_only' ? 'border-blue-500 bg-blue-50' : ''
								}`}
							>
								<div className="font-semibold">Public - Read Only</div>
								<div className="text-sm text-gray-600">Anyone with the link can view</div>
							</button>

							<button
								onClick={() => handleSharingChange('public_editable')}
								disabled={isChangingSharing}
								className={`w-full rounded-lg border p-4 text-left hover:border-blue-500 disabled:opacity-50 ${
									sharingMode === 'public_editable' ? 'border-blue-500 bg-blue-50' : ''
								}`}
							>
								<div className="font-semibold">Public - Editable</div>
								<div className="text-sm text-gray-600">Anyone with the link can edit</div>
							</button>
						</div>

						<div className="mt-6 flex justify-end gap-2">
							<button
								onClick={() => setShowSharingModal(false)}
								disabled={isChangingSharing}
								className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
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
