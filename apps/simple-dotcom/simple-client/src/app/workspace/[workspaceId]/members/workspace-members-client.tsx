'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { useWorkspaceRealtimeUpdates } from '@/hooks/useWorkspaceRealtimeUpdates'
import { Workspace } from '@/lib/api/types'
import { WORKSPACE_LIMITS } from '@/lib/constants'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

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
	inviteUrl: string | null
	currentUserId: string
}

export default function WorkspaceMembersClient({
	workspace,
	members: initialMembers,
	inviteLink,
	inviteUrl,
	currentUserId,
}: WorkspaceMembersClientProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [isToggling, setIsToggling] = useState(false)
	const [isRegenerating, setIsRegenerating] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	// Fetch members data with React Query
	// Hybrid approach: Realtime for instant updates + polling for reliability
	const { data: members = initialMembers } = useQuery<Member[]>({
		queryKey: ['workspace-members', workspace.id],
		queryFn: async () => {
			const response = await fetch(`/api/workspaces/${workspace.id}/members`)
			const result = await response.json()
			if (!result.success) {
				throw new Error(result.error?.message || 'Failed to fetch members')
			}
			// The API now returns members in the correct format for owners
			return result.data as Member[]
		},
		initialData: initialMembers,
		staleTime: 1000 * 10, // 10 seconds - shorter to catch missed realtime events
		refetchInterval: 1000 * 15, // Poll every 15 seconds as fallback
		refetchOnMount: true, // Refetch when returning to members page
		refetchOnReconnect: true, // Refetch when connection restored
	})

	// Memoize onChange to prevent subscription reconnects
	const handleRealtimeChange = useCallback(() => {
		// Invalidate queries to trigger refetch when any workspace event is received
		queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.id] })
	}, [queryClient, workspace.id])

	// Enable realtime subscriptions using broadcast pattern
	// This follows the documented hybrid realtime strategy (broadcast + polling)
	useWorkspaceRealtimeUpdates(workspace.id, {
		onChange: handleRealtimeChange,
		enabled: true,
	})

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

	const handleToggleInvite = useCallback(async () => {
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

			toast.success(inviteLink?.enabled ? 'Invite link disabled' : 'Invite link enabled', {
				duration: 3000,
			})
			// Trigger a page refresh to get updated invite link state
			// Invite link is server-rendered, so we need to refresh the page
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setIsToggling(false)
		}
	}, [workspace.id, inviteLink?.enabled, router])

	const handleRegenerateInvite = useCallback(async () => {
		if (!confirm('Regenerate invite link? The old link will stop working.')) {
			return
		}

		setIsRegenerating(true)

		try {
			const res = await fetch(`/api/workspaces/${workspace.id}/invite/regenerate`, {
				method: 'POST',
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || 'Failed to regenerate invite link')
			}

			toast.success('Invite link regenerated', { duration: 3000 })
			// Trigger a page refresh to get updated invite link with new token
			// Invite link is server-rendered, so we need to refresh the page
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setIsRegenerating(false)
		}
	}, [workspace.id, router])

	const handleCopyInviteLink = useCallback(() => {
		if (inviteUrl) {
			navigator.clipboard.writeText(inviteUrl)
			toast.success('Invite link copied to clipboard', { duration: 3000 })
		}
	}, [inviteUrl])

	const handleRemoveMember = useCallback(
		async (memberId: string) => {
			if (!confirm('Remove this member from the workspace?')) {
				return
			}

			try {
				const res = await fetch(`/api/workspaces/${workspace.id}/members/${memberId}`, {
					method: 'DELETE',
				})

				if (!res.ok) {
					const data = await res.json()
					throw new Error(data.message || 'Failed to remove member')
				}

				toast.success('Member removed', { duration: 3000 })
				// Invalidate the query to refetch members list
				// The realtime subscription will also trigger this
				queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.id] })
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'An unexpected error occurred')
			}
		},
		[workspace.id, queryClient]
	)

	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<header className="border-b px-6 py-4">
				<div className="flex items-center justify-between">
					<h1 className=" font-bold">Workspace Members</h1>
					<Link
						href={`/workspace/${workspace.id}`}
						className="rounded-md border px-4 py-2  hover:bg-gray-50"
					>
						Back to Workspace
					</Link>
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto p-6">
				<div className="mx-auto max-w-4xl space-y-8">
					{/* Member limit warning */}
					{members.length >= WORKSPACE_LIMITS.WARNING_THRESHOLD && (
						<div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
							<div className="flex items-start">
								<div className="flex-1">
									<h3 className=" font-medium text-yellow-800">Approaching member limit:</h3>
									<p className="mt-1  text-yellow-700">
										This workspace has {members.length} of {WORKSPACE_LIMITS.MAX_MEMBERS} members.
										Consider removing inactive members before the limit is reached.
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Invitation Link */}
					<section className="rounded-lg border p-6">
						<h2 className="mb-4  font-semibold">Invitation Link</h2>
						<p className="mb-4  text-gray-600">
							Share this link with people you want to invite to the workspace.
						</p>

						{inviteLink && (
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<input
										type="text"
										value={inviteUrl || ''}
										readOnly
										className="flex-1 rounded-md border bg-gray-50 dark:bg-gray-900 px-3 py-2  font-mono text-gray-900 dark:text-gray-100"
									/>
									<button
										onClick={handleCopyInviteLink}
										disabled={!inviteLink.enabled}
										className="rounded-md bg-blue-600 px-4 py-2  text-white hover:bg-blue-700 disabled:opacity-50"
									>
										Copy
									</button>
								</div>

								<div className="flex gap-2">
									<button
										onClick={handleToggleInvite}
										disabled={isToggling}
										className="rounded-md border px-4 py-2  hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
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
										className="rounded-md border px-4 py-2  hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
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
						<h2 className="mb-4  font-semibold">
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
									<p className="mt-2  text-gray-600">
										Found {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
									</p>
								)}
							</div>
						)}

						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginatedMembers.map((member) => {
										const isCurrentUser = member.id === currentUserId
										const isOwner = member.role === 'owner'

										return (
											<TableRow key={member.id}>
												<TableCell className="font-medium">
													{member.display_name || member.email}
													{isCurrentUser && (
														<span className="ml-2  text-muted-foreground">(You)</span>
													)}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{member.display_name ? member.email : '—'}
												</TableCell>
												<TableCell>
													<Badge variant={isOwner ? 'default' : 'secondary'}>
														{isOwner ? 'Owner' : 'Member'}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													{!isOwner && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleRemoveMember(member.id)}
															className="text-destructive hover:text-destructive"
														>
															Remove
														</Button>
													)}
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>

						{/* Pagination controls - only show if more than itemsPerPage */}
						{totalPages > 1 && (
							<div className="mt-4 flex items-center justify-between">
								<p className=" text-gray-600">
									Showing {startIndex + 1} to {Math.min(endIndex, filteredMembers.length)} of{' '}
									{filteredMembers.length} members
								</p>
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious
												data-testid="pagination-previous"
												onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
												aria-disabled={currentPage === 1}
												className={
													currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
												}
											/>
										</PaginationItem>
										<PaginationItem>
											<span className="px-3 py-1 ">
												Page {currentPage} of {totalPages}
											</span>
										</PaginationItem>
										<PaginationItem>
											<PaginationNext
												data-testid="pagination-next"
												onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
												aria-disabled={currentPage === totalPages}
												className={
													currentPage === totalPages
														? 'pointer-events-none opacity-50'
														: 'cursor-pointer'
												}
											/>
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</div>
						)}
					</section>
				</div>
			</main>
		</div>
	)
}
