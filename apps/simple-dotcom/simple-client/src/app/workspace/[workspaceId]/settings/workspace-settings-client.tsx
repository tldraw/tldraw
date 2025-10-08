'use client'

import { Workspace } from '@/lib/api/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
	userId,
	members = [],
}: WorkspaceSettingsClientProps) {
	const router = useRouter()
	const [isRenaming, setIsRenaming] = useState(false)
	const [name, setName] = useState(workspace.name)
	const [isSavingRename, setIsSavingRename] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isLeaving, setIsLeaving] = useState(false)
	const [isTransferring, setIsTransferring] = useState(false)
	const [selectedNewOwner, setSelectedNewOwner] = useState<string>('')
	const [showTransferConfirm, setShowTransferConfirm] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Invitation link states
	const [invitationLink, setInvitationLink] = useState<{
		id: string
		workspace_id: string
		token: string
		enabled: boolean
		created_at: string
		regenerated_at: string | null
	} | null>(null)
	const [isLoadingInvite, setIsLoadingInvite] = useState(false)
	const [isRegenerating, setIsRegenerating] = useState(false)
	const [isTogglingInvite, setIsTogglingInvite] = useState(false)
	const [copySuccess, setCopySuccess] = useState(false)

	const handleRename = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setIsSavingRename(true)

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

			// Trigger router refresh and wait for UI to update
			router.refresh()
			// Give Next.js time to refetch and update the UI
			await new Promise((resolve) => setTimeout(resolve, 500))

			setIsRenaming(false)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setIsSavingRename(false)
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
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
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
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
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

			// Refresh router cache to invalidate cached data
			router.refresh()
			// Redirect to workspace page after successful transfer
			router.push(`/workspace/${workspace.id}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
			setIsTransferring(false)
		}
	}

	// Fetch invitation link status on mount
	useEffect(() => {
		if (isOwner && !workspace.is_private) {
			fetchInvitationLink()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [workspace.id, isOwner, workspace.is_private])

	const fetchInvitationLink = async () => {
		setIsLoadingInvite(true)
		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/invite`)
			if (res.ok) {
				const result = await res.json()
				if (result.success && result.data) {
					setInvitationLink(result.data)
				}
			} else if (res.status === 403) {
				// User is not an owner, don't show invitation link section
				console.log('User is not workspace owner')
			} else {
				console.error('Failed to fetch invitation link:', res.status, res.statusText)
			}
		} catch (err) {
			console.error('Failed to fetch invitation link:', err)
		} finally {
			setIsLoadingInvite(false)
		}
	}

	const handleToggleInvite = async () => {
		setIsTogglingInvite(true)
		setError(null)
		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/invite`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: !invitationLink?.enabled }),
			})

			if (!res.ok) {
				const result = await res.json()
				throw new Error(result.error?.message || 'Failed to toggle invitation link')
			}

			const result = await res.json()
			if (result.success && result.data) {
				setInvitationLink(result.data)
			}
		} catch (err) {
			// For network errors or API errors, show a consistent error message
			const errorMessage =
				err instanceof Error && err.message ? err.message : 'Failed to toggle invitation link'
			setError(errorMessage.includes('toggle') ? errorMessage : 'Failed to toggle invitation link')
		} finally {
			setIsTogglingInvite(false)
		}
	}

	const handleRegenerateInvite = async () => {
		if (
			!confirm(
				'Are you sure you want to regenerate the invitation link? The old link will stop working immediately.'
			)
		) {
			return
		}

		setIsRegenerating(true)
		setError(null)
		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/invite/regenerate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			})

			if (!res.ok) {
				const result = await res.json()
				throw new Error(result.error?.message || 'Failed to regenerate invitation link')
			}

			const result = await res.json()
			if (result.success && result.data) {
				setInvitationLink(result.data)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setIsRegenerating(false)
		}
	}

	const handleCopyInviteLink = async () => {
		if (invitationLink?.token) {
			try {
				const url = `${window.location.origin}/invite/${invitationLink.token}`
				await navigator.clipboard.writeText(url)
				setCopySuccess(true)
				setTimeout(() => setCopySuccess(false), 2000)
			} catch {
				setError('Failed to copy link to clipboard')
			}
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
					<div className="flex gap-2">
						<Link
							href={`/workspace/${workspace.id}/archive`}
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Archive
						</Link>
						<Link
							href={`/workspace/${workspace.id}/members`}
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Members
						</Link>
						<Link
							href={`/workspace/${workspace.id}`}
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Back to Workspace
						</Link>
					</div>
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
									className="w-full rounded-md border px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
									disabled={isSavingRename}
									required
								/>
								<div className="flex gap-2">
									<button
										type="submit"
										disabled={isSavingRename}
										className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isSavingRename ? 'Saving...' : 'Save'}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsRenaming(false)
											setName(workspace.name)
											setError(null)
										}}
										disabled={isSavingRename}
										className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

					{/* Invitation Links - Only for owners of shared workspaces */}
					{isOwner && !workspace.is_private && (
						<section className="rounded-lg border p-6">
							<h2 className="mb-4 text-lg font-semibold">Invitation Link</h2>
							<p className="mb-4 text-sm text-gray-600">
								Share this link to invite people to your workspace. Anyone with the link can join as
								a member.
							</p>

							{isLoadingInvite ? (
								<div className="text-sm text-gray-500">Loading invitation link...</div>
							) : invitationLink ? (
								<div className="space-y-4">
									{/* Link status badge */}
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium">Status:</span>
										<span
											data-testid="invitation-link-status"
											className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
												invitationLink.enabled
													? 'bg-green-100 text-green-800'
													: 'bg-gray-100 text-gray-800'
											}`}
										>
											{invitationLink.enabled ? 'Enabled' : 'Disabled'}
										</span>
									</div>

									{/* Invitation link display and copy */}
									{invitationLink.enabled && invitationLink.token && (
										<div className="space-y-2">
											<div className="flex items-center gap-2">
												<input
													type="text"
													value={`${window.location.origin}/invite/${invitationLink.token}`}
													readOnly
													className="flex-1 rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-700"
												/>
												<button
													onClick={handleCopyInviteLink}
													className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
												>
													{copySuccess ? 'Copied!' : 'Copy'}
												</button>
											</div>
										</div>
									)}

									{/* Dates */}
									{(invitationLink.created_at || invitationLink.regenerated_at) && (
										<div className="text-xs text-gray-500">
											{invitationLink.regenerated_at ? (
												<>
													Last regenerated:{' '}
													{new Date(invitationLink.regenerated_at).toLocaleDateString()}
												</>
											) : (
												<>Created: {new Date(invitationLink.created_at).toLocaleDateString()}</>
											)}
										</div>
									)}

									{/* Actions */}
									<div className="flex gap-2">
										<button
											onClick={handleToggleInvite}
											disabled={isTogglingInvite}
											className={`rounded-md px-4 py-2 text-sm ${
												invitationLink.enabled
													? 'bg-gray-600 text-white hover:bg-gray-700'
													: 'bg-green-600 text-white hover:bg-green-700'
											} disabled:opacity-50`}
										>
											{isTogglingInvite
												? 'Processing...'
												: invitationLink.enabled
													? 'Disable Link'
													: 'Enable Link'}
										</button>
										{invitationLink.enabled && (
											<button
												onClick={handleRegenerateInvite}
												disabled={isRegenerating}
												className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
											>
												{isRegenerating ? 'Regenerating...' : 'Regenerate Link'}
											</button>
										)}
									</div>
								</div>
							) : (
								<div className="text-sm text-gray-500">Loading invitation settings...</div>
							)}
						</section>
					)}

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
