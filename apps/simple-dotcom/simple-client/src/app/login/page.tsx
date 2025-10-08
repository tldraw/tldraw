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
import { AlertCircle, Info } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function LoginForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
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
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8">
				{inviteContext && (
					<Alert>
						<Info className="h-4 w-4" />
						<AlertDescription>{inviteContext}</AlertDescription>
					</Alert>
				)}

				<div className="text-center">
					<h1 className="text-3xl font-bold">Welcome back</h1>
					<p className="mt-2 text-sm text-foreground/60">
						No account?{' '}
						<Link
							href={`/signup${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
							className="font-medium hover:underline"
						>
							Sign up
						</Link>
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

						<div className="space-y-4">
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
										<div className="flex items-center justify-between">
											<FormLabel>Password</FormLabel>
											<Link
												href="/forgot-password"
												className="text-xs font-medium text-foreground/60 hover:text-foreground hover:underline"
											>
												Forgot password?
											</Link>
										</div>
										<FormControl>
											<Input
												{...field}
												type="password"
												autoComplete="current-password"
												data-testid="password-input"
												placeholder="Enter your password"
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
							data-testid="login-button"
							className="w-full"
						>
							{form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
						</Button>
					</form>
				</Form>
			</div>
		</div>
	)
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-background">
					<div className="text-sm text-foreground/60">Loading...</div>
				</div>
			}
		>
			<LoginForm />
		</Suspense>
	)
}
