'use client'

import { cn } from '@/utils/cn'
import { Field, Label, Textarea } from '@headlessui/react'
import { ArrowLongRightIcon, CheckCircleIcon, HandThumbDownIcon } from '@heroicons/react/20/solid'
import { HandThumbUpIcon } from '@heroicons/react/24/solid'
import { FormEventHandler, useState } from 'react'

export const DocsFeedbackWidget: React.FC<{ className?: string }> = ({ className }) => {
	const [state, setState] = useState<'idle' | 'thumbs-up' | 'thumbs-down' | 'success' | 'error'>(
		'idle'
	)
	const [feedback, setFeedback] = useState<string>('')

	const submit: FormEventHandler = (e) => {
		e.preventDefault()
		setState('success')
	}

	return (
		<div
			className={cn('-ml-4 px-4 bg-zinc-50 rounded-lg shrink-0 mt-12 text-xs h-auto', className)}
		>
			{state !== 'success' && (
				<div className="flex justify-between items-center">
					<span>Is this page helpful?</span>
					<div className="flex">
						<button
							onClick={() =>
								setState((state) => (state === 'thumbs-down' ? 'idle' : 'thumbs-down'))
							}
							className={cn(
								'h-9 w-7 flex items-center justify-center pt-0.5',
								state === 'thumbs-down' && 'text-blue-500',
								state !== 'thumbs-down' && 'hover:text-black'
							)}
						>
							<HandThumbDownIcon className="h-4" />
						</button>
						<button
							onClick={() => setState((state) => (state === 'thumbs-up' ? 'idle' : 'thumbs-up'))}
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
			{(state === 'thumbs-up' || state === 'thumbs-down') && (
				<form onSubmit={submit} className="pb-3">
					<Field>
						<Label className="sr-only">Your feedback</Label>
						<Textarea
							name="feedback"
							placeholder="Your feedback..."
							rows={3}
							className="resize-none bg-zinc-200/50 w-full rounded-md placeholder-zinc-400 text-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-50"
							value={feedback}
							onChange={(e) => setFeedback(e.target.value)}
						/>
					</Field>
					<button
						type="submit"
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
