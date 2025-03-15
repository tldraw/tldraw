'use client'

import { Button } from '@/components/common/button'
import { submitNewsletterSignup } from '@/scripts/submit-newsletter-signup'
import { cn } from '@/utils/cn'
import { useLocalStorageState } from '@/utils/storage'
import { Field, Input, Label } from '@headlessui/react'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/20/solid'
import { FormEventHandler, useCallback, useState } from 'react'

// when debugging is true, the form will always show (even if the user has submitted)
const DEBUGGING = false

export function NewsletterSignup({
	bg = true,
	size = 'large',
	hideAfterSubmit = true,
}: {
	bg?: boolean
	size?: 'small' | 'large'
	hideAfterSubmit?: boolean
}) {
	// If the user has submitted their email, we don't show the form anymore
	const [didSubmit, setDidSubmit] = useLocalStorageState('dev_did_submit_newsletter', false)

	// Todo: replace with react query or something to handle the async work
	const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

	const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
		async (e) => {
			if (formState !== 'idle') return
			e.preventDefault()
			setFormState('loading')
			try {
				const _email = new FormData(e.currentTarget)?.get('email') as string
				const hubspotCookie = document.cookie
					.split('; ')
					.find((row) => row.startsWith('hubspotutk='))
					?.split('=')[1]
				const url = window.location.href
				const { error } = await submitNewsletterSignup(_email, hubspotCookie, url)
				if (error) throw error
				setFormState('success')
				// After a pause, we locally save that the user has submitted the form
				setTimeout(() => {
					setDidSubmit(true)
					setTimeout(() => setFormState('idle'), 3000)
				}, 3000)
			} catch {
				setFormState('error')
				// After a pause, we set the form state to idle
				setTimeout(() => setFormState('idle'), 3000)
			}
		},
		[setDidSubmit, formState]
	)

	// If the user has already submitted the form, we don't show it anymore,
	// unless we're both in development mode AND the debug flag is enabled.
	if (hideAfterSubmit && didSubmit && !(DEBUGGING && process.env.NODE_ENV === 'development')) {
		return null
	}

	return (
		<div
			className={cn(
				bg ? 'bg-zinc-50 dark:bg-zinc-900' : 'bg-transparent',
				size === 'small'
					? 'mt-12 rounded-lg text-xs xl:-ml-4 p-4 pb-1'
					: 'rounded-xl p-8 sm:p-12 text-center'
			)}
		>
			<h3
				className={cn(
					'text-black dark:text-white',
					size === 'small'
						? 'text-base leading-tight mb-2 font-semibold'
						: 'text-2xl mb-3 font-bold'
				)}
			>
				Subscribe to our Newsletter
			</h3>
			<p className={cn(size === 'small' ? 'mb-4' : 'mb-8 text-zinc-800 dark:text-zinc-100')}>
				Team news, product updates and deep dives from the team.
			</p>
			<form
				onSubmit={handleSubmit}
				className={cn(
					'pb-3',
					size === 'large' &&
						'flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2'
				)}
			>
				<Field className={cn(size === 'large' && 'grow sm:max-w-xs')}>
					<Label htmlFor="email" className="sr-only">
						Email-Address
					</Label>
					<Input
						name="email"
						type="email"
						placeholder="Your Email-Address"
						className={cn(
							'resize-none bg-zinc-200/50 dark:bg-zinc-700/50 w-full rounded-md placeholder-zinc-400 dark:placeholder-zinc-600 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-50 dark:focus:ring-offset-zinc-900',
							size === 'small' ? 'h-6 px-2' : 'text-base h-9 px-3'
						)}
						required
					/>
				</Field>
				<Button
					id="mailing-list-subscribe"
					submit
					caption="Subscribe"
					arrow="right"
					size={size === 'small' ? 'xs' : 'base'}
					className={cn('justify-center', size === 'small' && 'w-full mt-2')}
					loading={formState === 'loading'}
				/>
			</form>
			{(formState === 'idle' || formState === 'loading') && size === 'large' && (
				<p className="mb-3 text-sm">Join 1,000+ subscribers</p>
			)}
			{formState === 'success' && (
				<p
					className={cn(
						'flex items-center gap-1.5 mb-3',
						size === 'large' && 'text-sm justify-center'
					)}
				>
					<CheckCircleIcon className="h-4 text-emerald-500 dark:text-emerald-400" />
					<span>Thanks for subscribing!</span>
				</p>
			)}
			{formState === 'error' && (
				<p
					className={cn(
						'flex items-center gap-1.5 mb-3',
						size === 'large' && 'text-sm justify-center'
					)}
				>
					<ExclamationCircleIcon className="h-4 text-rose-500 dark:text-rose-400" />
					<span>Something went wrong.</span>
				</p>
			)}
		</div>
	)
}

// Sendgrid List
// {
//     "name": "Tldraw Blog Newsletter",
//     "id": "f6dff24d-dbfb-4ceb-a76b-2cde94ac241b",
//     "contact_count": 0,
//     "_metadata": {
//         "self": "https://api.sendgrid.com/v3/marketing/lists/f6dff24d-dbfb-4ceb-a76b-2cde94ac241b"
//     }
// }
