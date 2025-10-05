'use client'

import { Workspace } from '@/lib/api/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Member {
	id: string
	email: string
	display_name: string | null
	role: 'owner' | 'member'
}

interface WorkspaceSettingsClientProps {
	workspace: Workspace
	isOwner: boolean
	role: 'owner' | 'member'
	userId: string
	members?: Member[]
}

export default function WorkspaceSettingsClient({
	workspace,
	isOwner,
	role,
	userId,
	members = [],
}: WorkspaceSettingsClientProps) {
	const router = useRouter()
	const [isRenaming, setIsRenaming] = useState(false)
	const [name, setName] = useState(workspace.name)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isLeaving, setIsLeaving] = useState(false)
	const [isTransferring, setIsTransferring] = useState(false)
	const [selectedNewOwner, setSelectedNewOwner] = useState<string>('')
	const [showTransferConfirm, setShowTransferConfirm] = useState(false)
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
		if (
			!confirm(
				'Are you sure you want to leave this workspace? You will lose access to all documents and folders in this workspace.'
			)
		) {
			return
		}

		setError(null)
		setIsLeaving(true)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/leave`, {
				method: 'POST',
			})

			const result = await res.json()

			if (!res.ok) {
				throw new Error(result.error?.message || 'Failed to leave workspace')
			}

			// Store success message in sessionStorage for dashboard to display
			if (result.data?.workspaceName) {
				sessionStorage.setItem(
					'leaveWorkspaceSuccess',
					`Successfully left workspace "${result.data.workspaceName}"`
				)
			}

			router.push('/dashboard')
		} catch (err: any) {
			setError(err.message)
			setIsLeaving(false)
		}
	}

	const handleTransferOwnership = async () => {
		if (!selectedNewOwner) {
			setError('Please select a member to transfer ownership to')
			return
		}

		setError(null)
		setIsTransferring(true)
		setShowTransferConfirm(false)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/transfer-ownership`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ new_owner_id: selectedNewOwner }),
			})

			const result = await res.json()

			if (!res.ok) {
				throw new Error(result.message || 'Failed to transfer ownership')
			}

			// Redirect to workspace page after successful transfer
			router.push(`/workspace/${workspace.id}`)
		} catch (err: any) {
			setError(err.message)
			setIsTransferring(false)
		}
	}

	// Filter out current user from potential new owners
	const eligibleMembers = members.filter((m) => m.id !== userId)

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

					{/* Ownership Transfer - Only show for owners of shared workspaces */}
					{isOwner && !workspace.is_private && eligibleMembers.length > 0 && (
						<section className="rounded-lg border p-6">
							<h2 className="mb-4 text-lg font-semibold">Transfer Ownership</h2>
							<p className="mb-4 text-sm text-gray-600">
								Transfer ownership of this workspace to another member. You will become a regular
								member after the transfer.
							</p>

							{!showTransferConfirm ? (
								<div className="space-y-4">
									<div>
										<label
											htmlFor="new-owner"
											className="block text-sm font-medium text-gray-700 mb-2"
										>
											Select new owner
										</label>
										<select
											id="new-owner"
											value={selectedNewOwner}
											onChange={(e) => setSelectedNewOwner(e.target.value)}
											className="w-full rounded-md border px-3 py-2"
											disabled={isTransferring}
										>
											<option value="">Choose a member...</option>
											{eligibleMembers.map((member) => (
												<option key={member.id} value={member.id}>
													{member.display_name || member.email} ({member.role})
												</option>
											))}
										</select>
									</div>

									<button
										onClick={() => {
											if (selectedNewOwner) {
												setShowTransferConfirm(true)
											} else {
												setError('Please select a member to transfer ownership to')
											}
										}}
										disabled={isTransferring || !selectedNewOwner}
										className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
									>
										Continue
									</button>
								</div>
							) : (
								<div className="space-y-4 rounded-lg bg-yellow-50 p-4">
									<p className="text-sm text-yellow-800">
										<strong>Confirm ownership transfer</strong>
									</p>
									<p className="text-sm text-gray-700">
										Are you sure you want to transfer ownership to{' '}
										<strong>
											{eligibleMembers.find((m) => m.id === selectedNewOwner)?.display_name ||
												eligibleMembers.find((m) => m.id === selectedNewOwner)?.email}
										</strong>
										?
									</p>
									<p className="text-sm text-gray-600">After this transfer:</p>
									<ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
										<li>You will become a regular member</li>
										<li>You will lose owner privileges (rename, delete, transfer)</li>
										<li>The new owner will have full control of the workspace</li>
									</ul>
									<div className="flex gap-2">
										<button
											onClick={handleTransferOwnership}
											disabled={isTransferring}
											className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
										>
											{isTransferring ? 'Transferring...' : 'Confirm Transfer'}
										</button>
										<button
											onClick={() => {
												setShowTransferConfirm(false)
												setError(null)
											}}
											disabled={isTransferring}
											className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
										>
											Cancel
										</button>
									</div>
								</div>
							)}
						</section>
					)}

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
