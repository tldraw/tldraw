'use client'

import { getBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoginPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
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
			setInviteContext('Sign in to join the workspace')
		}
	}, [redirectUrl])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		try {
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password,
			})

			if (signInError) {
				setError('Invalid email or password')
				return
			}

			// Redirect to specified URL or dashboard
			const destination = redirectUrl && isValidRedirect(redirectUrl) ? redirectUrl : '/dashboard'
			router.push(destination)
			router.refresh() // Refresh server components
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8">
				{inviteContext && (
					<div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-blue-800 dark:text-blue-200">
						<p className="text-sm font-medium">{inviteContext}</p>
					</div>
				)}

				<div className="text-center">
					<h1 className="text-3xl font-bold">Welcome back</h1>
					<p className="mt-2 text-sm text-foreground/60">
						Don't have an account?{' '}
						<Link
							href={`/signup${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
							className="font-medium hover:underline"
						>
							Sign up
						</Link>
					</p>
				</div>

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
							<div className="flex items-center justify-between mb-2">
								<label htmlFor="password" className="block text-sm font-medium">
									Password
								</label>
								<Link
									href="/forgot-password"
									className="text-xs font-medium text-foreground/60 hover:text-foreground hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								data-testid="password-input"
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="Enter your password"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						data-testid="login-button"
						className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Signing in...' : 'Sign in'}
					</button>
				</form>
			</div>
		</div>
	)
}
