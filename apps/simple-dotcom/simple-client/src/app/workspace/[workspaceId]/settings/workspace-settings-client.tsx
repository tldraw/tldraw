'use client'

import { Workspace } from '@/lib/api/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface WorkspaceSettingsClientProps {
	workspace: Workspace
	isOwner: boolean
	role: 'owner' | 'member'
	userId: string
}

export default function WorkspaceSettingsClient({
	workspace,
	isOwner,
	role,
	userId,
}: WorkspaceSettingsClientProps) {
	const router = useRouter()
	const [isRenaming, setIsRenaming] = useState(false)
	const [name, setName] = useState(workspace.name)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isLeaving, setIsLeaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleRename = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to rename workspace')
			}

			router.refresh()
			setIsRenaming(false)
		} catch (err: any) {
			setError(err.message)
		}
	}

	const handleDelete = async () => {
		if (
			!confirm(
				'Are you sure you want to delete this workspace? This action can be undone by restoring from trash.'
			)
		) {
			return
		}

		setError(null)
		setIsDeleting(true)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}`, {
				method: 'DELETE',
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to delete workspace')
			}

			router.push('/dashboard')
		} catch (err: any) {
			setError(err.message)
			setIsDeleting(false)
		}
	}

	const handleLeave = async () => {
		if (!confirm('Are you sure you want to leave this workspace?')) {
			return
		}

		setError(null)
		setIsLeaving(true)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/leave`, {
				method: 'POST',
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to leave workspace')
			}

			router.push('/dashboard')
		} catch (err: any) {
			setError(err.message)
			setIsLeaving(false)
		}
	}

	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<header className="border-b px-6 py-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Workspace Settings</h1>
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
				<div className="mx-auto max-w-2xl space-y-8">
					{error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}

					{/* Workspace Name */}
					<section className="rounded-lg border p-6">
						<h2 className="mb-4 text-lg font-semibold">Workspace Name</h2>
						{isRenaming && isOwner ? (
							<form onSubmit={handleRename} className="space-y-4">
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full rounded-md border px-3 py-2"
									disabled={!isOwner}
									required
								/>
								<div className="flex gap-2">
									<button
										type="submit"
										className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
									>
										Save
									</button>
									<button
										type="button"
										onClick={() => {
											setIsRenaming(false)
											setName(workspace.name)
											setError(null)
										}}
										className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
									>
										Cancel
									</button>
								</div>
							</form>
						) : (
							<div className="flex items-center justify-between">
								<p className="text-gray-700">{workspace.name}</p>
								{isOwner && (
									<button
										onClick={() => setIsRenaming(true)}
										className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
									>
										Rename
									</button>
								)}
							</div>
						)}
						{!isOwner && (
							<p className="mt-2 text-sm text-gray-500">
								Only the workspace owner can rename the workspace.
							</p>
						)}
					</section>

					{/* Workspace Type */}
					<section className="rounded-lg border p-6">
						<h2 className="mb-4 text-lg font-semibold">Workspace Type</h2>
						<p className="text-gray-700">
							{workspace.is_private ? 'Private Workspace' : 'Shared Workspace'}
						</p>
						{workspace.is_private && (
							<p className="mt-2 text-sm text-gray-500">
								Your private workspace is automatically created and cannot be deleted.
							</p>
						)}
					</section>

					{/* Leave/Delete Workspace */}
					<section className="rounded-lg border border-red-200 p-6">
						<h2 className="mb-4 text-lg font-semibold text-red-800">Danger Zone</h2>

						{!isOwner ? (
							<div>
								<p className="mb-4 text-sm text-gray-600">
									Leave this workspace. You will no longer have access to its documents and folders.
								</p>
								<button
									onClick={handleLeave}
									disabled={isLeaving}
									className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
								>
									{isLeaving ? 'Leaving...' : 'Leave Workspace'}
								</button>
							</div>
						) : (
							<div>
								<p className="mb-4 text-sm text-gray-600">
									{workspace.is_private
										? 'Your private workspace cannot be deleted.'
										: 'Soft delete this workspace. It can be restored later.'}
								</p>
								{!workspace.is_private && (
									<button
										onClick={handleDelete}
										disabled={isDeleting}
										className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
									>
										{isDeleting ? 'Deleting...' : 'Delete Workspace'}
									</button>
								)}
							</div>
						)}
					</section>
				</div>
			</main>
		</div>
	)
}
