'use client'

import { authClient } from '@/lib/auth-client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function ResetPasswordForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const token = searchParams.get('token')

	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	// Password validation
	const isPasswordValid = password.length >= 8
	const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0
	const showPasswordHint = password.length > 0 && !isPasswordValid
	const showMatchError = confirmPassword.length > 0 && !doPasswordsMatch

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!token) {
			setError('Invalid or missing reset token')
			return
		}

		if (!isPasswordValid) {
			setError('Password must be at least 8 characters long')
			return
		}

		if (!doPasswordsMatch) {
			setError('Passwords do not match')
			return
		}

		setLoading(true)
		setError(null)

		try {
			const result = await authClient.resetPassword({
				newPassword: password,
				token,
			})

			if (result.error) {
				// Handle specific error cases
				if (result.error.message?.includes('expired')) {
					setError('This reset link has expired. Please request a new one.')
				} else if (result.error.message?.includes('invalid')) {
					setError('This reset link is invalid. Please request a new one.')
				} else {
					setError(result.error.message || 'Failed to reset password')
				}
				return
			}

			setSuccess(true)
			// Redirect to dashboard after 2 seconds
			setTimeout(() => {
				router.push('/dashboard')
			}, 2000)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setLoading(false)
		}
	}

	// Show error state for missing/invalid token
	if (!token) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-md space-y-8">
					<div className="text-center">
						<h1 className="text-3xl font-bold">Invalid reset link</h1>
						<div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
							<p className="text-sm text-red-800 dark:text-red-200">
								This password reset link is invalid or has expired.
							</p>
						</div>
						<p className="mt-6 text-sm text-foreground/60">
							<Link href="/forgot-password" className="font-medium hover:underline">
								Request a new reset link
							</Link>
						</p>
					</div>
				</div>
			</div>
		)
	}

	// Show success state
	if (success) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-md space-y-8">
					<div className="text-center">
						<h1 className="text-3xl font-bold">Password reset successful</h1>
						<div className="mt-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
							<p className="text-sm text-green-800 dark:text-green-200">
								Your password has been reset successfully. Redirecting to dashboard...
							</p>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Set new password</h1>
					<p className="mt-2 text-sm text-foreground/60">Enter a new password for your account.</p>
				</div>

				<form onSubmit={handleSubmit} className="mt-8 space-y-6">
					{error && (
						<div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
							{error}
						</div>
					)}

					<div className="space-y-4">
						<div>
							<label htmlFor="password" className="block text-sm font-medium mb-2">
								New password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="new-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="At least 8 characters"
							/>
							{showPasswordHint && (
								<p className="mt-1 text-xs text-red-600 dark:text-red-400">
									Password must be at least 8 characters long
								</p>
							)}
						</div>

						<div>
							<label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
								Confirm new password
							</label>
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								autoComplete="new-password"
								required
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="Confirm your password"
							/>
							{showMatchError && (
								<p className="mt-1 text-xs text-red-600 dark:text-red-400">
									Passwords do not match
								</p>
							)}
						</div>
					</div>

					<button
						type="submit"
						disabled={loading || !isPasswordValid || !doPasswordsMatch}
						className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Resetting password...' : 'Reset password'}
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

// Wrap in Suspense to handle useSearchParams
export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-background p-4">
					<div className="text-sm text-foreground/60">Loading...</div>
				</div>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	)
}
