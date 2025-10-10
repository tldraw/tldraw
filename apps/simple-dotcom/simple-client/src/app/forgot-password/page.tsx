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
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const forgotPasswordSchema = z.object({
	email: z.string().email('Invalid email address'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [submittedEmail, setSubmittedEmail] = useState('')
	const supabase = getBrowserClient()

	const form = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: '',
		},
	})

	const onSubmit = async (data: ForgotPasswordFormValues) => {
		setError(null)
		setSuccess(false)

		try {
			const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
				redirectTo: `${window.location.origin}/reset-password`,
			})

			if (resetError) {
				throw resetError
			}

			// Always show success message for security reasons
			// (don't reveal if email exists in system)
			setSubmittedEmail(data.email)
			setSuccess(true)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		}
	}

	if (success) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-md space-y-8">
					<div className="text-center">
						<h1 className=" font-bold">Check your email</h1>
						<Alert variant="success" data-testid="success-message" className="mt-4">
							<CheckCircle2 className="h-4 w-4" />
							<AlertDescription>
								If an account exists with <strong>{submittedEmail}</strong>, you will receive a
								password reset link shortly.
							</AlertDescription>
						</Alert>
						<p className="mt-6  text-foreground/60">
							Didn&apos;t receive an email? Check your spam folder or{' '}
							<button
								onClick={() => {
									setSuccess(false)
									form.reset()
								}}
								className="font-medium hover:underline"
							>
								try again
							</button>
							.
						</p>
						<p className="mt-4  text-foreground/60">
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
					<h1 className=" font-bold">Reset your password</h1>
					<p className="mt-2  text-foreground/60">
						Enter your email address and we&apos;ll send you a link to reset your password.
					</p>
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
						{error && (
							<Alert variant="destructive" data-testid="error-message">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email address</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="email"
											autoComplete="email"
											data-testid="email-input"
											placeholder="you@example.com"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							disabled={form.formState.isSubmitting}
							data-testid="send-reset-button"
							className="w-full"
						>
							{form.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
						</Button>

						<p className="text-center  text-foreground/60">
							Remember your password?{' '}
							<Link href="/login" className="font-medium hover:underline">
								Back to login
							</Link>
						</p>
					</form>
				</Form>
			</div>
		</div>
	)
}
