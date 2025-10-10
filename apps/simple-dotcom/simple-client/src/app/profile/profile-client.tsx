'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useUnsavedChanges } from '@/hooks'
import { User } from '@/lib/api/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

interface ProfileClientProps {
	profile: User | null
}

const profileSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
	display_name: z
		.string()
		.min(1, 'Display name is required')
		.max(100, 'Display name must be less than 100 characters'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfileClient({ profile }: ProfileClientProps) {
	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			name: profile?.name || '',
			display_name: profile?.display_name || '',
		},
	})

	const isDirty = form.formState.isDirty

	// Warn when navigating away with unsaved changes
	useUnsavedChanges(isDirty)

	const onSubmit = async (data: ProfileFormValues) => {
		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: data.name.trim(),
					display_name: data.display_name.trim(),
				}),
			})

			const responseData = await response.json()

			if (!response.ok || !responseData.success) {
				toast.error(responseData.error?.message || 'Failed to update profile')
				return
			}

			toast.success('Profile updated successfully', { duration: 3000 })
			// Reset form to new values to clear dirty state
			form.reset(data)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'An unexpected error occurred')
		}
	}

	if (!profile) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p>Profile not found</p>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-2xl">
				<div className="mb-8">
					<Link
						href="/dashboard"
						className=" text-foreground/60 hover:text-foreground hover:underline"
					>
						← Back to Dashboard
					</Link>
				</div>

				<div className="rounded-lg border border-foreground/20 p-6">
					<h1 className=" font-bold mb-6">Profile Settings</h1>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							{isDirty && (
								<Alert data-testid="unsaved-changes-indicator">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>
										<p className="font-medium">Unsaved changes</p>
										<p className="text-xs mt-1">Your changes have not been saved yet.</p>
									</AlertDescription>
								</Alert>
							)}

							<div>
								<FormLabel htmlFor="email">Email address</FormLabel>
								<Input
									id="email"
									name="email"
									type="email"
									disabled
									value={profile.email || ''}
									data-testid="email-input"
									className="mt-2"
								/>
								<FormDescription>Email addresses cannot be changed</FormDescription>
							</div>

							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Full name</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="text"
												maxLength={100}
												data-testid="name-input"
												placeholder="Enter your full name"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="display_name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Display name</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="text"
												maxLength={100}
												data-testid="display-name-input"
												placeholder="Enter your display name"
											/>
										</FormControl>
										<FormDescription>
											This is how other users will see your name throughout the app
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								disabled={form.formState.isSubmitting}
								data-testid="save-button"
								className="w-full"
							>
								{form.formState.isSubmitting ? 'Saving...' : 'Save changes'}
							</Button>
						</form>
					</Form>
				</div>
			</div>
		</div>
	)
}
