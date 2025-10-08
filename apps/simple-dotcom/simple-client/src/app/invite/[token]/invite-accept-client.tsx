'use client'

import { Workspace } from '@/lib/api/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface InviteAcceptClientProps {
	status:
		| 'valid'
		| 'invalid'
		| 'disabled'
		| 'already_member'
		| 'regenerated'
		| 'member_limit'
		| 'loading'
	workspace: Workspace | null
	message: string | null
	token: string
	userId: string | null
}

export default function InviteAcceptClient({
	status,
	workspace,
	message,
	token,
}: InviteAcceptClientProps) {
	const router = useRouter()
	const [isJoining, setIsJoining] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleJoin = async () => {
		setError(null)
		setIsJoining(true)

		try {
			const res = await fetch(`/api/invite/${token}/join`, {
				method: 'POST',
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.error?.message || 'Failed to join workspace')
			}

			const response = await res.json()

			// Redirect to workspace
			router.push(`/workspace/${response.data.workspace_id}`)
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
			setIsJoining(false)
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-lg">
				{status === 'valid' && workspace && (
					<>
						<div className="mb-6 text-center">
							<div className="mb-4 text-5xl">📨</div>
							<h1 className="mb-2 text-2xl font-bold">Join Workspace</h1>
							<p className="text-gray-600">
								You have been invited to join{' '}
								<span className="font-semibold">{workspace.name}</span>
							</p>
						</div>

						{error && (
							<div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
						)}

						<button
							onClick={handleJoin}
							disabled={isJoining}
							className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
						>
							{isJoining ? 'Joining...' : 'Join Workspace'}
						</button>

						<div className="mt-4 text-center">
							<Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
								Go to Dashboard
							</Link>
						</div>
					</>
				)}

				{status === 'invalid' && (
					<>
						<div className="mb-6 text-center">
							<div className="mb-4 text-5xl">❌</div>
							<h1 className="mb-2 text-2xl font-bold">Invalid Invitation</h1>
							<p className="text-gray-600">{message}</p>
						</div>

						<Link
							href="/dashboard"
							className="block w-full rounded-md border bg-gray-50 px-4 py-3 text-center font-semibold hover:bg-gray-100"
						>
							Go to Dashboard
						</Link>
					</>
				)}

				{status === 'disabled' && workspace && (
					<>
						<div className="mb-6 text-center">
							<div className="mb-4 text-5xl">🔒</div>
							<h1 className="mb-2 text-2xl font-bold">Link Disabled</h1>
							<p className="text-gray-600">
								The invitation link for <span className="font-semibold">{workspace.name}</span> has
								been disabled.
							</p>
							<p className="mt-2 text-sm text-gray-500">
								Please contact the workspace owner for a new invitation link.
							</p>
						</div>

						<Link
							href="/dashboard"
							className="block w-full rounded-md border bg-gray-50 px-4 py-3 text-center font-semibold hover:bg-gray-100"
						>
							Go to Dashboard
						</Link>
					</>
				)}

				{status === 'already_member' && workspace && (
					<>
						<div className="mb-6 text-center">
							<div className="mb-4 text-5xl">✅</div>
							<h1 className="mb-2 text-2xl font-bold">Already a Member</h1>
							<p className="text-gray-600">{message}</p>
						</div>

						<Link
							href={`/workspace/${workspace.id}`}
							className="block w-full rounded-md bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700"
						>
							Go to Workspace
						</Link>

						<div className="mt-4 text-center">
							<Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
								Go to Dashboard
							</Link>
						</div>
					</>
				)}

				{status === 'regenerated' && (
					<>
						<div className="mb-6 text-center">
							<div className="mb-4 text-5xl">🔄</div>
							<h1 className="mb-2 text-2xl font-bold">Link Expired</h1>
							<p className="text-gray-600">
								This invitation link has expired. A new link was generated for{' '}
								<span className="font-semibold">{workspace?.name || 'this workspace'}</span>.
							</p>
							<p className="mt-2 text-sm text-gray-500">
								Please contact the workspace owner for the new invitation link.
							</p>
						</div>

						<Link
							href="/dashboard"
							className="block w-full rounded-md border bg-gray-50 px-4 py-3 text-center font-semibold hover:bg-gray-100"
						>
							Go to Dashboard
						</Link>
					</>
				)}

				{status === 'member_limit' && (
					<>
						<div className="mb-6 text-center">
							<div className="mb-4 text-5xl">👥</div>
							<h1 className="mb-2 text-2xl font-bold">Workspace Full</h1>
							<p className="text-gray-600">
								<span className="font-semibold">{workspace?.name || 'This workspace'}</span> has
								reached its member limit.
							</p>
							<p className="mt-2 text-sm text-gray-500">
								Please contact the workspace owner to increase the member limit or remove inactive
								members.
							</p>
						</div>

						<Link
							href="/dashboard"
							className="block w-full rounded-md border bg-gray-50 px-4 py-3 text-center font-semibold hover:bg-gray-100"
						>
							Go to Dashboard
						</Link>
					</>
				)}

				{status === 'loading' && (
					<div className="flex flex-col items-center justify-center p-8">
						<div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
						<p className="text-gray-600">Validating invitation...</p>
					</div>
				)}
			</div>
		</div>
	)
}
