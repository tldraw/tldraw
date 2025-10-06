'use client'

import { Workspace } from '@/lib/api/types'
import { WORKSPACE_LIMITS } from '@/lib/constants'
import { getBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

interface Member {
	id: string
	email: string
	display_name: string | null
	role: 'owner' | 'member'
}

interface InviteLink {
	id: string
	token: string
	enabled: boolean
	created_at: string
	regenerated_at: string | null
	workspace_id: string
}

interface WorkspaceMembersClientProps {
	workspace: Workspace
	members: Member[]
	inviteLink: InviteLink | null
	currentUserId: string
}

export default function WorkspaceMembersClient({
	workspace,
	members: initialMembers,
	inviteLink,
	currentUserId,
}: WorkspaceMembersClientProps) {
	const router = useRouter()
	const [members, setMembers] = useState(initialMembers)
	const [isToggling, setIsToggling] = useState(false)
	const [isRegenerating, setIsRegenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	const inviteUrl = inviteLink ? `${window.location.origin}/invite/${inviteLink.token}` : null

	// Set up real-time subscription for member changes
	useEffect(() => {
		const supabase = getBrowserClient()

		const channel = supabase
			.channel(`workspace-members-${workspace.id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'workspace_members',
					filter: `workspace_id=eq.${workspace.id}`,
				},
				(_payload) => {
					// Refresh the page to get updated member list
					// In a production app, we'd update state more efficiently
					router.refresh()
				}
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [workspace.id, router])

	// Filter members based on search term
	const filteredMembers = useMemo(() => {
		if (!searchTerm) return members

		const term = searchTerm.toLowerCase()
		return members.filter((member) => {
			const name = member.display_name || member.email
			return name.toLowerCase().includes(term)
		})
	}, [members, searchTerm])

	// Pagination logic
	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

	// Reset page when search changes
	useEffect(() => {
		setCurrentPage(1)
	}, [searchTerm])

	const handleToggleInvite = async () => {
		setError(null)
		setSuccess(null)
		setIsToggling(true)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/invite`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_enabled: !inviteLink?.enabled }),
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to toggle invite link')
			}

			setSuccess(inviteLink?.enabled ? 'Invite link disabled' : 'Invite link enabled')
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setIsToggling(false)
		}
	}

	const handleRegenerateInvite = async () => {
		if (!confirm('Regenerate invite link? The old link will stop working.')) {
			return
		}

		setError(null)
		setSuccess(null)
		setIsRegenerating(true)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/invite/regenerate`, {
				method: 'POST',
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to regenerate invite link')
			}

			setSuccess('Invite link regenerated')
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setIsRegenerating(false)
		}
	}

	const handleCopyInviteLink = () => {
		if (inviteUrl) {
			navigator.clipboard.writeText(inviteUrl)
			setSuccess('Invite link copied to clipboard')
			setTimeout(() => setSuccess(null), 3000)
		}
	}

	const handleRemoveMember = async (memberId: string) => {
		if (!confirm('Remove this member from the workspace?')) {
			return
		}

		setError(null)
		setSuccess(null)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/members/${memberId}`, {
				method: 'DELETE',
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to remove member')
			}

			// Update local state immediately for better UX
			setMembers((prevMembers) => prevMembers.filter((m) => m.id !== memberId))
			setSuccess('Member removed')

			// Still refresh to ensure consistency
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		}
	}

	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<header className="border-b px-6 py-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Workspace Members</h1>
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
				<div className="mx-auto max-w-4xl space-y-8">
					{error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}
					{success && (
						<div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">{success}</div>
					)}

					{/* Member limit warning */}
					{members.length >= WORKSPACE_LIMITS.WARNING_THRESHOLD && (
						<div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
							<p className="text-sm text-yellow-800">
								<strong>Approaching member limit:</strong> This workspace has {members.length} of{' '}
								{WORKSPACE_LIMITS.MAX_MEMBERS} members. Consider removing inactive members before
								the limit is reached.
							</p>
						</div>
					)}

					{/* Invitation Link */}
					<section className="rounded-lg border p-6">
						<h2 className="mb-4 text-lg font-semibold">Invitation Link</h2>
						<p className="mb-4 text-sm text-gray-600">
							Share this link with people you want to invite to the workspace.
						</p>

						{inviteLink && (
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<input
										type="text"
										value={inviteUrl || ''}
										readOnly
										className="flex-1 rounded-md border bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100"
									/>
									<button
										onClick={handleCopyInviteLink}
										disabled={!inviteLink.enabled}
										className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
									>
										Copy
									</button>
								</div>

								<div className="flex gap-2">
									<button
										onClick={handleToggleInvite}
										disabled={isToggling}
										className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
									>
										{isToggling
											? 'Processing...'
											: inviteLink.enabled
												? 'Disable Link'
												: 'Enable Link'}
									</button>
									<button
										onClick={handleRegenerateInvite}
										disabled={isRegenerating}
										className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
									>
										{isRegenerating ? 'Regenerating...' : 'Regenerate Link'}
									</button>
								</div>

								<p className="text-xs text-gray-500">
									Status:{' '}
									<span className={inviteLink.enabled ? 'text-green-600' : 'text-gray-600'}>
										{inviteLink.enabled ? 'Enabled' : 'Disabled'}
									</span>
								</p>
							</div>
						)}
					</section>

					{/* Members List */}
					<section className="rounded-lg border p-6">
						<h2 className="mb-4 text-lg font-semibold">
							Members ({members.length}/{WORKSPACE_LIMITS.MAX_MEMBERS})
						</h2>

						{/* Search bar - only show if more than 10 members */}
						{members.length > 10 && (
							<div className="mb-4">
								<input
									type="text"
									placeholder="Search members by name or email..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full rounded-md border px-3 py-2"
								/>
								{searchTerm && (
									<p className="mt-2 text-sm text-gray-600">
										Found {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
									</p>
								)}
							</div>
						)}

						<div className="space-y-2">
							{paginatedMembers.map((member) => {
								const isCurrentUser = member.id === currentUserId
								const isOwner = member.role === 'owner'

								return (
									<div
										key={member.id}
										className="flex items-center justify-between rounded-lg border p-4"
									>
										<div>
											<p className="font-medium">
												{member.display_name || member.email}
												{isCurrentUser && <span className="ml-2 text-sm text-gray-500">(You)</span>}
											</p>
											{member.display_name && (
												<p className="text-sm text-gray-500">{member.email}</p>
											)}
										</div>

										<div className="flex items-center gap-3">
											<span
												className={`rounded px-2 py-1 text-xs font-medium ${
													isOwner ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
												}`}
											>
												{isOwner ? 'Owner' : 'Member'}
											</span>

											{!isOwner && (
												<button
													onClick={() => handleRemoveMember(member.id)}
													className="text-sm text-red-600 hover:text-red-800"
												>
													Remove
												</button>
											)}
										</div>
									</div>
								)
							})}
						</div>

						{/* Pagination controls - only show if more than itemsPerPage */}
						{totalPages > 1 && (
							<div className="mt-4 flex items-center justify-between">
								<p className="text-sm text-gray-600">
									Showing {startIndex + 1} to {Math.min(endIndex, filteredMembers.length)} of{' '}
									{filteredMembers.length} members
								</p>
								<div className="flex gap-2">
									<button
										onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Previous
									</button>
									<span className="px-3 py-1 text-sm">
										Page {currentPage} of {totalPages}
									</span>
									<button
										onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
										disabled={currentPage === totalPages}
										className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</section>
				</div>
			</main>
		</div>
	)
}
