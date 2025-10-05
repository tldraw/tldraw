'use client'

import { getBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const supabase = getBrowserClient()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)
		setSuccess(false)

		try {
			const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password`,
			})

			if (resetError) {
				throw resetError
			}

			// Always show success message for security reasons
			// (don't reveal if email exists in system)
			setSuccess(true)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setLoading(false)
		}
	}

	if (success) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-md space-y-8">
					<div className="text-center">
						<h1 className="text-3xl font-bold">Check your email</h1>
						<div
							data-testid="success-message"
							className="mt-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4"
						>
							<p className="text-sm text-green-800 dark:text-green-200">
								If an account exists with <strong>{email}</strong>, you will receive a password
								reset link shortly.
							</p>
						</div>
						<p className="mt-6 text-sm text-foreground/60">
							Didn&apos;t receive an email? Check your spam folder or{' '}
							<button
								onClick={() => {
									setSuccess(false)
									setEmail('')
								}}
								className="font-medium hover:underline"
							>
								try again
							</button>
							.
						</p>
						<p className="mt-4 text-sm text-foreground/60">
							<Link href="/login" className="font-medium hover:underline">
								Back to login
							</Link>
						</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Reset your password</h1>
					<p className="mt-2 text-sm text-foreground/60">
						Enter your email address and we&apos;ll send you a link to reset your password.
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

					<button
						type="submit"
						disabled={loading}
						data-testid="send-reset-button"
						className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Sending...' : 'Send reset link'}
					</button>

					<p className="text-center text-sm text-foreground/60">
						Remember your password?{' '}
						<Link href="/login" className="font-medium hover:underline">
							Back to login
						</Link>
					</p>
				</form>
			</div>
		</div>
	)
}
