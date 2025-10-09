import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import LoginClient from './login-client'

function getRedirectAndContext(searchParams: URLSearchParams) {
	const redirectParam = searchParams.get('redirect')
	const inviteContext = redirectParam?.startsWith('/invite/')
		? 'Sign in to join the workspace'
		: null
	return { redirectParam, inviteContext }
}

export default async function LoginPage({
	searchParams,
}: {
	searchParams?: { [key: string]: string | string[] | undefined }
}) {
	// If authenticated, redirect to dashboard
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (user) {
		redirect('/dashboard')
	}

	// Compute redirect and context on the server
	const usp = new URLSearchParams()
	const params: Record<string, string | string[] | undefined> = searchParams ?? {}
	for (const [key, value] of Object.entries(params)) {
		if (Array.isArray(value)) {
			value.forEach((v) => usp.append(key, v))
		} else if (typeof value === 'string') {
			usp.set(key, value)
		}
	}
	const { redirectParam, inviteContext } = getRedirectAndContext(usp)

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-background">
					<div className="text-sm text-foreground/60">Loading...</div>
				</div>
			}
		>
			<LoginClient redirectUrl={redirectParam ?? null} inviteContext={inviteContext} />
		</Suspense>
	)
}
