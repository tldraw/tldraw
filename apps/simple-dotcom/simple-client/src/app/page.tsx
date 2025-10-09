import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
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
			<div className="w-full max-w-2xl text-center space-y-10">
				<Logo className="h-12 mx-auto" />
				<div className="flex gap-4 justify-center flex-col sm:flex-row">
					<Button asChild size="lg" className="w-full sm:w-auto">
						<Link href="/signup" data-testid="signup-link">
							Sign up
						</Link>
					</Button>
					<Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
						<Link href="/login" data-testid="login-link">
							Log in
						</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
