'use client'

import { Button } from '@/components/common/button'
import { cn } from '@/utils/cn'
import { Field, Input, Label } from '@headlessui/react'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/20/solid'
import { FormEventHandler, useState } from 'react'

export const NewsletterSignup: React.FC<{ size?: 'small' | 'large' }> = ({ size = 'large' }) => {
	const [state, setState] = useState<'idle' | 'success' | 'error'>('idle')
	const [email, setEmail] = useState<string>('')

	const submit: FormEventHandler = (e) => {
		e.preventDefault()
		setState('success')
	}

	return (
		<div
			className={cn(
				'bg-zinc-50',
				size === 'small'
					? 'mt-12 rounded-lg text-xs xl:-ml-4 p-4 pb-1'
					: 'rounded-xl p-8 sm:p-12 text-center'
			)}
		>
			<h3
				className={cn(
					'text-black',
					size === 'small'
						? 'text-base leading-tight mb-2 font-semibold'
						: 'text-2xl mb-3 font-bold'
				)}
			>
				Subscribe to our Newsletter
			</h3>
			<p className={cn(size === 'small' ? 'mb-4' : 'mb-8 text-zinc-800')}>
				Team news, product updates and deep dives from the team.
			</p>
			<form
				onSubmit={submit}
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
							'resize-none bg-zinc-200/50 w-full rounded-md placeholder-zinc-400 text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-50',
							size === 'small' ? 'h-6 px-2' : 'text-base h-9 px-3'
						)}
						value={email}
						required
						onChange={(e) => setEmail(e.target.value)}
					/>
				</Field>
				<Button
					submit
					caption="Submit"
					arrow="right"
					size={size === 'small' ? 'xs' : 'base'}
					className={cn('justify-center', size === 'small' && 'w-full mt-2')}
				/>
			</form>
			{state === 'idle' && size === 'large' && (
				<p className="mb-3 text-sm">Join 1,000+ subscribers</p>
			)}
			{state === 'success' && (
				<p
					className={cn(
						'flex items-center gap-1.5 mb-3',
						size === 'large' && 'text-sm justify-center'
					)}
				>
					<CheckCircleIcon className="h-4 text-emerald-500" />
					<span>Thanks for subscribing!</span>
				</p>
			)}
			{state === 'error' && (
				<p
					className={cn(
						'flex items-center gap-1.5 mb-3',
						size === 'large' && 'text-sm justify-center'
					)}
				>
					<ExclamationCircleIcon className="h-4 text-rose-500" />
					<span>Something went wrong.</span>
				</p>
			)}
		</div>
	)
}
