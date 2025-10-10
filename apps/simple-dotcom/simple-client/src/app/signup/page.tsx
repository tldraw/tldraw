'use client'

import { AuthPageLayout } from '@/components/auth/AuthPageLayout'
import { SecondaryLink } from '@/components/shared/SecondaryLink'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isValidRedirect } from '@/lib/auth/validation'
import { getBrowserClient } from '@/lib/supabase/browser'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
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
		<AuthPageLayout inviteContext={inviteContext} title="Create your account">
			{success ? (
				<Alert variant="success" data-testid="success-message" className="p-6">
					<CheckCircle2 className="h-5 w-5" />
					<div className="space-y-4">
						<div>
							<h2 className=" font-semibold mb-2">Check your email</h2>
							<AlertDescription>
								We&apos;ve sent a confirmation email to <strong>{submittedEmail}</strong>. Click the
								link in the email to activate your account and sign in.
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
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{error && (
						<Alert variant="destructive" data-testid="error-message">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<FieldGroup>
						<Field data-invalid={!!form.formState.errors.name}>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								id="name"
								type="text"
								data-testid="name-input"
								placeholder="Enter your name"
								aria-invalid={!!form.formState.errors.name}
								{...form.register('name')}
							/>
							<FieldError>{form.formState.errors.name?.message}</FieldError>
						</Field>

						<Field data-invalid={!!form.formState.errors.email}>
							<FieldLabel htmlFor="email">Email address</FieldLabel>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								data-testid="email-input"
								placeholder="you@example.com"
								aria-invalid={!!form.formState.errors.email}
								{...form.register('email')}
							/>
							<FieldError>{form.formState.errors.email?.message}</FieldError>
						</Field>

						<Field data-invalid={!!form.formState.errors.password}>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Input
								id="password"
								type="password"
								autoComplete="new-password"
								data-testid="password-input"
								placeholder="At least 8 characters"
								aria-invalid={!!form.formState.errors.password}
								{...form.register('password')}
							/>
							<FieldError>{form.formState.errors.password?.message}</FieldError>
						</Field>
					</FieldGroup>

					<Button
						type="submit"
						disabled={form.formState.isSubmitting}
						data-testid="signup-button"
						className="w-full"
					>
						{form.formState.isSubmitting ? 'Creating account...' : 'Create account'}
					</Button>

					<p className=" text-foreground/60 text-center">
						Already have an account?{' '}
						<SecondaryLink
							href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
						>
							Log in
						</SecondaryLink>
					</p>
				</form>
			)}
		</AuthPageLayout>
	)
}

export default function SignupPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-background">
					<div className=" text-foreground/60">Loading...</div>
				</div>
			}
		>
			<SignupForm />
		</Suspense>
	)
}
