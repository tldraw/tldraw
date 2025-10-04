'use client'

import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
	const router = useRouter()
	const { data: session } = authClient.useSession()

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

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-7xl">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<button
						onClick={handleSignOut}
						data-testid="logout-button"
						className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
					>
						Sign out
					</button>
				</div>

				<div className="rounded-lg border border-foreground/20 p-6">
					<h2 className="text-xl font-semibold mb-4">Welcome, {session.user?.name || 'User'}!</h2>
					<p className="text-foreground/60">Your dashboard is ready. More features coming soon.</p>
					<div data-testid="workspace-list" className="mt-6">
						{/* Workspace list will be added here */}
					</div>
				</div>
			</div>
		</div>
	)
}
