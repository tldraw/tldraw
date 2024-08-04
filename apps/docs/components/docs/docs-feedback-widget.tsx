'use client'

import { cn } from '@/utils/cn'
import { Field, Label, Textarea } from '@headlessui/react'
import { ArrowLongRightIcon, CheckCircleIcon, HandThumbDownIcon } from '@heroicons/react/20/solid'
import { HandThumbUpIcon } from '@heroicons/react/24/solid'
import { usePathname } from 'next/navigation'
import { FormEventHandler, useCallback, useState } from 'react'
import { useLocalStorageState } from 'tldraw'

const DEBUGGING = false

async function submitFeedback(
	_sessionId: string,
	_pathname: string,
	_feedback: 1 | -1 | 0,
	_note: string
) {
	// todo
	await new Promise((resolve) => setTimeout(resolve, 2000))
	return
}

export const DocsFeedbackWidget: React.FC<{ className?: string }> = ({ className }) => {
	const pathname = usePathname()

	const [didSubmit, setDidSubmit] = useLocalStorageState(pathname + '-feedback-submitted', false)

	// Set the feedback session id to a random id and stash it in storage
	const [sessionId] = useLocalStorageState(
		'feedback-session-id',
		Math.random().toString(36).substring(7)
	)
	const [state, setState] = useState<
		'idle' | 'thumbs-up' | 'thumbs-down' | 'loading' | 'success' | 'error'
	>('idle')

	const handleThumbsDown = useCallback(async () => {
		if (state === 'loading') return
		if (state === 'thumbs-down') {
			setState('idle')
			try {
				await submitFeedback(sessionId, pathname, 0, '')
			} catch (e) {
				setState('error')
			}
			return
		}

		// todo: send feedback to endpoint
		setState('thumbs-down')
		try {
			await submitFeedback(sessionId, pathname, -1, '')
		} catch (e) {
			setState('error')
		}
	}, [pathname, sessionId, state])

	const handleThumbsUp = useCallback(() => {
		if (state === 'loading') return
		if (state === 'thumbs-up') {
			setState('idle')
			try {
				submitFeedback(sessionId, pathname, 0, '')
			} catch (e) {
				setState('error')
			}
			return
		}

		// todo: send feedback to endpoint
		setState('thumbs-up')
		try {
			submitFeedback(sessionId, pathname, 1, '')
		} catch (e) {
			setState('error')
		}
	}, [pathname, sessionId, state])

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			if (state === 'loading') return

			try {
				const form = e.currentTarget
				const formData = new FormData(form)
				const feedback = formData.get('feedback') as string

				setState('loading')
				await submitFeedback(sessionId, pathname, state === 'thumbs-up' ? 1 : -1, feedback)
				setState('success')
				setTimeout(() => {
					setDidSubmit(true)
				}, 3000)
			} catch (e) {
				setState('error')
			}
		},
		[state, sessionId, pathname, setDidSubmit]
	)

	if (didSubmit && !(DEBUGGING && process.env.NODE_ENV === 'development')) return null

	return (
		<div
			className={cn('-ml-4 px-4 bg-zinc-50 rounded-lg shrink-0 mt-12 text-xs h-auto', className)}
		>
			{state !== 'success' && (
				<div className="flex justify-between items-center">
					<span>Is this page helpful?</span>
					<div className="flex">
						<button
							onClick={handleThumbsDown}
							className={cn(
								'h-9 w-7 flex items-center justify-center pt-0.5',
								state === 'thumbs-down' && 'text-blue-500',
								state !== 'thumbs-down' && 'hover:text-black'
							)}
						>
							<HandThumbDownIcon className="h-4" />
						</button>
						<button
							onClick={handleThumbsUp}
							className={cn(
								'h-9 w-7 flex items-center justify-center pb-0.5 -mr-1',
								state === 'thumbs-up' && 'text-blue-500',
								state !== 'thumbs-up' && 'hover:text-black'
							)}
						>
							<HandThumbUpIcon className="h-4" />
						</button>
					</div>
				</div>
			)}
			{(state === 'thumbs-up' || state === 'thumbs-down' || state === 'loading') && (
				<form onSubmit={handleSubmit} className="pb-3">
					<Field>
						<Label className="sr-only">Your feedback</Label>
						<Textarea
							name="feedback"
							placeholder="Your feedback..."
							rows={3}
							className="resize-none bg-zinc-200/50 w-full rounded-md placeholder-zinc-400 text-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-50"
						/>
					</Field>
					<button
						type="submit"
						disabled={state === 'loading'}
						className="bg-blue-500 rounded-md h-6 px-3 flex items-center text-white gap-1.5 font-medium ml-auto mt-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-50 hover:bg-blue-600"
					>
						<span>Submit</span>
						<ArrowLongRightIcon className="h-3.5" />
					</button>
				</form>
			)}
			{state === 'success' && (
				<p className="h-9 flex items-center gap-1.5">
					<CheckCircleIcon className="h-4 text-emerald-500" />
					<span>Thanks for your feedback!</span>
				</p>
			)}
		</div>
	)
}
