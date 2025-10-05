import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
	// Redirect authenticated users to dashboard
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (user) {
		redirect('/dashboard')
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-2xl space-y-8 text-center">
				<div className="space-y-4">
					<h1 className="text-5xl font-bold">Welcome to Simple Dotcom</h1>
					<p className="text-lg text-foreground/60">
						A collaborative workspace for your documents and ideas
					</p>
				</div>

				<div className="flex gap-4 items-center justify-center flex-col sm:flex-row pt-8">
					<Link
						href="/signup"
						data-testid="signup-link"
						className="w-full sm:w-auto rounded-md bg-foreground px-8 py-3 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2"
					>
						Sign up
					</Link>
					<Link
						href="/login"
						data-testid="login-link"
						className="w-full sm:w-auto rounded-md border border-foreground/20 px-8 py-3 text-sm font-medium hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2"
					>
						Log in
					</Link>
				</div>
			</div>
		</div>
	)
}
