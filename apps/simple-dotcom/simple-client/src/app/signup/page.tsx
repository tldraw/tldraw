'use client'

import { getBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function SignupForm() {
	const searchParams = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [inviteContext, setInviteContext] = useState<string | null>(null)
	const supabase = getBrowserClient()

	// Get redirect URL from query params
	const redirectUrl = searchParams.get('redirect')

	// Validate redirect URL to prevent open redirect attacks
	const isValidRedirect = (url: string) => {
		// Only allow internal redirects
		return url.startsWith('/') && !url.startsWith('//')
	}

	useEffect(() => {
		// Check if coming from invite flow
		if (redirectUrl?.startsWith('/invite/')) {
			setInviteContext('Create an account to join the workspace')
		}
	}, [redirectUrl])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		try {
			// Construct the redirect URL for email confirmation callback
			const destination = redirectUrl && isValidRedirect(redirectUrl) ? redirectUrl : '/dashboard'
			const confirmationRedirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`

			const { error: signUpError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						name: name,
					},
					emailRedirectTo: confirmationRedirectUrl,
				},
			})

			if (signUpError) {
				setError(signUpError.message || 'Failed to create account')
				return
			}

			// Show success message - user needs to confirm their email
			setSuccess(true)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setLoading(false)
		}
	}

	// Password strength validation
	const isPasswordValid = password.length >= 8
	const showPasswordHint = password.length > 0 && !isPasswordValid

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8">
				{inviteContext && (
					<div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-blue-800 dark:text-blue-200">
						<p className="text-sm font-medium">{inviteContext}</p>
					</div>
				)}

				<div className="text-center">
					<h1 className="text-3xl font-bold">Create your account</h1>
					<p className="mt-2 text-sm text-foreground/60">
						Already have an account?{' '}
						<Link
							href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
							className="font-medium hover:underline"
						>
							Log in
						</Link>
					</p>
				</div>

				{success ? (
					<div
						data-testid="success-message"
						className="rounded-md bg-green-50 dark:bg-green-900/20 p-6 text-center space-y-4"
					>
						<div className="text-green-800 dark:text-green-200">
							<h2 className="text-lg font-semibold mb-2">Check your email</h2>
							<p className="text-sm">
								We&apos;ve sent a confirmation email to <strong>{email}</strong>. Click the link in
								the email to activate your account and sign in.
							</p>
						</div>
						<p className="text-xs text-foreground/60">
							Didn&apos;t receive the email? Check your spam folder or{' '}
							<Link href="/login" className="font-medium hover:underline">
								try logging in
							</Link>
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="mt-8 space-y-6">
						{error && (
							<div
								data-testid="error-message"
								className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200"
							>
								{error}
							</div>
						)}

					<div className="space-y-4">
						<div>
							<label htmlFor="name" className="block text-sm font-medium mb-2">
								Name
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								data-testid="name-input"
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="Enter your name"
							/>
						</div>

						<div>
							<label htmlFor="email" className="block text-sm font-medium mb-2">
								Email address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								data-testid="email-input"
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="you@example.com"
							/>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium mb-2">
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="new-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								data-testid="password-input"
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="At least 8 characters"
							/>
							{showPasswordHint && (
								<p className="mt-1 text-xs text-red-600 dark:text-red-400">
									Password must be at least 8 characters long
								</p>
							)}
						</div>
					</div>

						<button
							type="submit"
							disabled={loading || !isPasswordValid}
							data-testid="signup-button"
							className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Creating account...' : 'Create account'}
						</button>
					</form>
				)}
			</div>
		</div>
	)
}

export default function SignupPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-background">
					<div className="text-sm text-foreground/60">Loading...</div>
				</div>
			}
		>
			<SignupForm />
		</Suspense>
	)
}
