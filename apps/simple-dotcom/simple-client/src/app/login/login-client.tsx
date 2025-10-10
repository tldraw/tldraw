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
import { AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginClient({
	redirectUrl,
	inviteContext,
}: {
	redirectUrl: string | null
	inviteContext: string | null
}) {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const supabase = getBrowserClient()

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	})

	const onSubmit = async (data: LoginFormValues) => {
		setError(null)

		try {
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: data.email,
				password: data.password,
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
		}
	}

	return (
		<AuthPageLayout inviteContext={inviteContext} title="Sign in">
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{error && (
					<Alert variant="destructive" data-testid="error-message">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<FieldGroup>
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
						<div className="flex justify-between leading-none">
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<SecondaryLink href="/forgot-password">Forgot password?</SecondaryLink>
						</div>
						<Input
							id="password"
							type="password"
							autoComplete="current-password"
							data-testid="password-input"
							placeholder="Enter your password"
							aria-invalid={!!form.formState.errors.password}
							{...form.register('password')}
						/>
						<FieldError>{form.formState.errors.password?.message}</FieldError>
					</Field>
				</FieldGroup>

				<Button
					type="submit"
					disabled={form.formState.isSubmitting}
					data-testid="login-button"
					className="w-full"
				>
					{form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
				</Button>

				<p className=" text-foreground/60 text-center">
					No account?{' '}
					<SecondaryLink
						href={redirectUrl ? `/signup?redirect=${encodeURIComponent(redirectUrl)}` : '/signup'}
					>
						Sign up
					</SecondaryLink>
				</p>
			</form>
		</AuthPageLayout>
	)
}
