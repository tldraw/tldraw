'use client'

import { useUnsavedChanges } from '@/hooks'
import { User } from '@/lib/api/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface ProfileClientProps {
	profile: User | null
}

export default function ProfileClient({ profile }: ProfileClientProps) {
	const [name, setName] = useState(profile?.name || '')
	const [displayName, setDisplayName] = useState(profile?.display_name || '')
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [isDirty, setIsDirty] = useState(false)

	// Track unsaved changes
	useEffect(() => {
		const hasChanges =
			name !== (profile?.name || '') || displayName !== (profile?.display_name || '')
		setIsDirty(hasChanges)
	}, [name, displayName, profile])

	// Warn when navigating away with unsaved changes
	useUnsavedChanges(isDirty)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setSaving(true)
		setError(null)
		setSuccess(false)

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: name.trim(),
					display_name: displayName.trim(),
				}),
			})

			const data = await response.json()

			if (!response.ok || !data.success) {
				setError(data.error?.message || 'Failed to update profile')
				return
			}

			setSuccess(true)
			// Clear dirty state after successful save
			setIsDirty(false)

			// Clear success message after 3 seconds
			setTimeout(() => setSuccess(false), 3000)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		} finally {
			setSaving(false)
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
						className="text-sm text-foreground/60 hover:text-foreground hover:underline"
					>
						← Back to Dashboard
					</Link>
				</div>

				<div className="rounded-lg border border-foreground/20 p-6">
					<h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

					<form onSubmit={handleSubmit} className="space-y-6">
						{isDirty && !error && !success && (
							<div
								data-testid="unsaved-changes-indicator"
								className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200"
							>
								<p className="font-medium">Unsaved changes</p>
								<p className="text-xs mt-1">Your changes have not been saved yet.</p>
							</div>
						)}

						{error && (
							<div
								data-testid="error-message"
								className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200"
							>
								{error}
							</div>
						)}

						{success && (
							<div
								data-testid="success-message"
								className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200"
							>
								Profile updated successfully!
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
								disabled
								value={profile.email || ''}
								data-testid="email-input"
								className="w-full rounded-md border border-foreground/20 bg-foreground/5 px-3 py-2 text-sm text-foreground/60 cursor-not-allowed"
							/>
							<p className="mt-1 text-xs text-foreground/50">Email addresses cannot be changed</p>
						</div>

						<div>
							<label htmlFor="name" className="block text-sm font-medium mb-2">
								Full name
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								maxLength={100}
								value={name}
								onChange={(e) => setName(e.target.value)}
								data-testid="name-input"
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="Enter your full name"
							/>
						</div>

						<div>
							<label htmlFor="displayName" className="block text-sm font-medium mb-2">
								Display name
							</label>
							<input
								id="displayName"
								name="displayName"
								type="text"
								required
								maxLength={100}
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								data-testid="display-name-input"
								className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
								placeholder="Enter your display name"
							/>
							<p className="mt-1 text-xs text-foreground/50">
								This is how other users will see your name throughout the app
							</p>
						</div>

						<button
							type="submit"
							disabled={saving}
							data-testid="save-button"
							className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? 'Saving...' : 'Save changes'}
						</button>
					</form>
				</div>
			</div>
		</div>
	)
}
