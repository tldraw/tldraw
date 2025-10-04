'use client'

import { User } from '@/lib/api/types'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
	const router = useRouter()
	const { data: session } = authClient.useSession()
	const [profile, setProfile] = useState<User | null>(null)

	// Fetch user profile to get display_name
	useEffect(() => {
		const fetchProfile = async () => {
			if (!session) return

			try {
				const response = await fetch('/api/profile')
				const data = await response.json()

				if (data.success && data.data) {
					setProfile(data.data)
				}
			} catch (err) {
				console.error('Failed to fetch profile:', err)
			}
		}

		fetchProfile()
	}, [session])

	const handleSignOut = async () => {
		await authClient.signOut()
		router.push('/login')
	}

	if (!session) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p>Loading...</p>
			</div>
		)
	}

	// Use display_name from profile, fallback to name from session, then 'User'
	const displayName = profile?.display_name || session.user?.name || 'User'

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-7xl">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<div className="flex items-center gap-3">
						<Link
							href="/profile"
							className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
						>
							Profile
						</Link>
						<button
							onClick={handleSignOut}
							data-testid="logout-button"
							className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
						>
							Sign out
						</button>
					</div>
				</div>

				<div className="rounded-lg border border-foreground/20 p-6">
					<h2 className="text-xl font-semibold mb-4">Welcome, {displayName}!</h2>
					<p className="text-foreground/60">Your dashboard is ready. More features coming soon.</p>
					<div data-testid="workspace-list" className="mt-6">
						{/* Workspace list will be added here */}
					</div>
				</div>
			</div>
		</div>
	)
}
