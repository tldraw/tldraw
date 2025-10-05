'use client'

import { getBrowserClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ResetPasswordPage() {
	const router = useRouter()
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const supabase = getBrowserClient()

	// Check if we have a valid recovery token
	useEffect(() => {
		const hashParams = new URLSearchParams(window.location.hash.substring(1))
		const accessToken = hashParams.get('access_token')
		const type = hashParams.get('type')

		if (type !== 'recovery' || !accessToken) {
			setError('Invalid or missing password reset link. Please request a new one.')
		}
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		if (password !== confirmPassword) {
			setError('Passwords do not match')
			setLoading(false)
			return
		}

		if (password.length < 8) {
			setError('Password must be at least 8 characters long')
			setLoading(false)
			return
		}

		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password: password,
			})

			if (updateError) {
				throw updateError
			}

			setSuccess(true)
			// Redirect to login after 3 seconds
			setTimeout(() => {
				router.push('/login')
			}, 3000)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to reset password')
		} finally {
			setLoading(false)
		}
	}

	if (success) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-md space-y-8">
					<div className="text-center">
						<h1 className="text-3xl font-bold">Password reset successful</h1>
						<div
							data-testid="success-message"
							className="mt-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4"
						>
							<p className="text-sm text-green-800 dark:text-green-200">
								Your password has been reset successfully. Redirecting to login...
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
					<p className="mt-2 text-sm text-foreground/60">Enter your new password below</p>
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
								data-testid="password-input"
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="At least 8 characters"
							/>
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
								data-testid="confirm-password-input"
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="Confirm your password"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading || !password || !confirmPassword}
						data-testid="reset-button"
						className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Resetting...' : 'Reset password'}
					</button>
				</form>
			</div>
		</div>
	)
}
