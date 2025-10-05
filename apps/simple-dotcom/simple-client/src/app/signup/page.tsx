'use client'

import { getBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignupPage() {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const supabase = getBrowserClient()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		try {
			const { error: signUpError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						name: name,
					},
				},
			})

			if (signUpError) {
				setError(signUpError.message || 'Failed to create account')
				return
			}

			// Auto sign in after signup
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password,
			})

			if (signInError) {
				setError('Account created but failed to sign in. Please try logging in.')
				return
			}

			// Redirect to dashboard on success
			router.push('/dashboard')
			router.refresh() // Refresh server components
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
				<div className="text-center">
					<h1 className="text-3xl font-bold">Create your account</h1>
					<p className="mt-2 text-sm text-foreground/60">
						Already have an account?{' '}
						<Link href="/login" className="font-medium hover:underline">
							Log in
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
			</div>
		</div>
	)
}
