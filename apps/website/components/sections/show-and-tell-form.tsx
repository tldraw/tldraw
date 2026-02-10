'use client'

import { ChevronRight } from '@/components/ui/chevron-icon'
import { useState } from 'react'

interface ShowAndTellFormProps {
	title: string
	description: string
}

export function ShowAndTellForm({ title, description }: ShowAndTellFormProps) {
	const [submitted, setSubmitted] = useState(false)

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		// TODO: wire up to an actual endpoint
		setSubmitted(true)
	}

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
				<div>
					<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">{title}</h2>
					<p className="mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">{description}</p>
				</div>

				{submitted ? (
					<div className="mt-10 rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950">
						<p className="text-lg font-semibold text-green-800 dark:text-green-200">
							Thanks for sharing! We&rsquo;ll take a look.
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="mt-10 max-w-2xl space-y-6">
						<div className="grid gap-6 sm:grid-cols-2">
							<div>
								<label
									htmlFor="firstName"
									className="mb-2 block text-sm font-medium text-black dark:text-white"
								>
									First name
								</label>
								<input
									id="firstName"
									name="firstName"
									type="text"
									required
									className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
								/>
							</div>
							<div>
								<label
									htmlFor="lastName"
									className="mb-2 block text-sm font-medium text-black dark:text-white"
								>
									Last name
								</label>
								<input
									id="lastName"
									name="lastName"
									type="text"
									required
									className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
								/>
							</div>
						</div>
						<div className="grid gap-6 sm:grid-cols-2">
							<div>
								<label
									htmlFor="email"
									className="mb-2 block text-sm font-medium text-black dark:text-white"
								>
									Email
								</label>
								<input
									id="email"
									name="email"
									type="email"
									required
									placeholder="hello@tldraw.com"
									className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
								/>
							</div>
							<div>
								<label
									htmlFor="link"
									className="mb-2 block text-sm font-medium text-black dark:text-white"
								>
									Link
								</label>
								<input
									id="link"
									name="link"
									type="url"
									placeholder="www.tldraw.com"
									className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
								/>
							</div>
						</div>
						<div>
							<label
								htmlFor="projectDescription"
								className="mb-2 block text-sm font-medium text-black dark:text-white"
							>
								Project description
							</label>
							<textarea
								id="projectDescription"
								name="projectDescription"
								rows={4}
								placeholder="What have you done?"
								className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
							/>
						</div>
						<button
							type="submit"
							className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto sm:min-w-[200px]"
						>
							Submit <ChevronRight />
						</button>
					</form>
				)}
			</div>
		</section>
	)
}
