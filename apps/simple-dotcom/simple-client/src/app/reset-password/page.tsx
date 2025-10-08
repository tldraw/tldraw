'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { getBrowserClient } from '@/lib/supabase/browser'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const resetPasswordSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string().min(1, 'Please confirm your password'),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
	const router = useRouter()
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

	const form = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			password: '',
			confirmPassword: '',
		},
	})

	const onSubmit = async (data: ResetPasswordFormValues) => {
		setError(null)

		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password: data.password,
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
		}
	}

	if (success) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-md space-y-8">
					<div className="text-center">
						<h1 className="text-3xl font-bold">Password reset successful</h1>
						<Alert variant="success" data-testid="success-message" className="mt-4">
							<CheckCircle2 className="h-4 w-4" />
							<AlertDescription>
								Your password has been reset successfully. Redirecting to login...
							</AlertDescription>
						</Alert>
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

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
						{error && (
							<Alert variant="destructive" data-testid="error-message">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<div className="space-y-4">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>New password</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="password"
												autoComplete="new-password"
												data-testid="password-input"
												placeholder="At least 8 characters"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Confirm new password</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="password"
												autoComplete="new-password"
												data-testid="confirm-password-input"
												placeholder="Confirm your password"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<Button
							type="submit"
							disabled={form.formState.isSubmitting}
							data-testid="reset-button"
							className="w-full"
						>
							{form.formState.isSubmitting ? 'Resetting...' : 'Reset password'}
						</Button>
					</form>
				</Form>
			</div>
		</div>
	)
}
