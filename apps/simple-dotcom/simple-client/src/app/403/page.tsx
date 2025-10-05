import Link from 'next/link'

export default function ForbiddenPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8 text-center">
				<div>
					<h1 className="text-6xl font-bold text-foreground/20">403</h1>
					<h2 className="mt-4 text-2xl font-bold">Access Denied</h2>
					<p className="mt-2 text-sm text-foreground/60">
						You do not have permission to access this workspace or resource.
					</p>
				</div>

				<div className="space-y-3 pt-4">
					<p className="text-sm text-foreground/70">
						If you believe this is a mistake, please contact the workspace owner.
					</p>
					<div className="flex flex-col gap-3">
						<Link
							href="/dashboard"
							className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2 inline-block"
						>
							Go to Dashboard
						</Link>
					</div>
				</div>

				<div className="pt-8 text-xs text-foreground/40">
					<p>
						Need help?{' '}
						<Link href="/dashboard" className="hover:underline">
							Contact support
						</Link>
					</p>
				</div>
			</div>
		</div>
	)
}
