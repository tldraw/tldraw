'use client'

import { Workspace } from '@/lib/api/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface InviteAcceptClientProps {
	status: 'valid' | 'invalid' | 'disabled' | 'already_member'
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
	userId,
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
				throw new Error(data.message || 'Failed to join workspace')
			}

			const data = await res.json()

			// Redirect to workspace
			router.push(`/workspace/${data.workspace_id}`)
		} catch (err: any) {
			setError(err.message)
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
								You've been invited to join <span className="font-semibold">{workspace.name}</span>
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
			</div>
		</div>
	)
}
