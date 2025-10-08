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
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const signupSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
})

type SignupFormValues = z.infer<typeof signupSchema>

function SignupForm() {
	const searchParams = useSearchParams()
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [submittedEmail, setSubmittedEmail] = useState('')
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

	const form = useForm<SignupFormValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			name: '',
			email: '',
			password: '',
		},
	})

	const onSubmit = async (data: SignupFormValues) => {
		setError(null)

		try {
			// Construct the redirect URL for email confirmation callback
			const destination = redirectUrl && isValidRedirect(redirectUrl) ? redirectUrl : '/dashboard'
			const confirmationRedirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`

			const { data: authData, error: signUpError } = await supabase.auth.signUp({
				email: data.email,
				password: data.password,
				options: {
					data: {
						name: data.name,
					},
					emailRedirectTo: confirmationRedirectUrl,
				},
			})

			if (signUpError) {
				setError(signUpError.message || 'Failed to create account')
				return
			}

			// Check if user is immediately confirmed (local dev mode)
			// If confirmed, redirect immediately. Otherwise show email confirmation message.
			if (authData.user && authData.session) {
				// User is signed in, redirect
				window.location.href = destination
			} else {
				// User needs to confirm email
				setSubmittedEmail(data.email)
				setSuccess(true)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8">
				{inviteContext && (
					<Alert>
						<Info className="h-4 w-4" />
						<AlertDescription>{inviteContext}</AlertDescription>
					</Alert>
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
					<Alert variant="success" data-testid="success-message" className="p-6">
						<CheckCircle2 className="h-5 w-5" />
						<div className="space-y-4">
							<div>
								<h2 className="text-lg font-semibold mb-2">Check your email</h2>
								<AlertDescription>
									We&apos;ve sent a confirmation email to <strong>{submittedEmail}</strong>. Click
									the link in the email to activate your account and sign in.
								</AlertDescription>
							</div>
							<p className="text-xs text-foreground/60">
								Didn&apos;t receive the email? Check your spam folder or{' '}
								<Link href="/login" className="font-medium hover:underline">
									try logging in
								</Link>
							</p>
						</div>
					</Alert>
				) : (
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
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="text"
													data-testid="name-input"
													placeholder="Enter your name"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

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

								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
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
							</div>

							<Button
								type="submit"
								disabled={form.formState.isSubmitting}
								data-testid="signup-button"
								className="w-full"
							>
								{form.formState.isSubmitting ? 'Creating account...' : 'Create account'}
							</Button>
						</form>
					</Form>
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
