'use client'

import { useState } from 'react'

interface PitchYourselfFormProps {
	title: string
	description: string
}

export function PitchYourselfForm({ title, description }: PitchYourselfFormProps) {
	const [submitted, setSubmitted] = useState(false)

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		// TODO: wire up to an actual endpoint
		setSubmitted(true)
	}

	return (
		<div className="border-b border-zinc-200 py-10 dark:border-zinc-800 sm:py-14">
			<div className="flex flex-col gap-8 lg:flex-row lg:gap-8">
				{/* Left column - heading and description (matches FAQ section layout) */}
				<div className="lg:w-1/2">
					<h2 className="text-2xl font-semibold text-black dark:text-white sm:text-[32px]">
						{title}
					</h2>
					<p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-body dark:text-zinc-400 lg:mt-6">
						{description}
					</p>
				</div>
				{/* Right column - form */}
				<div className="lg:w-1/2">
					{submitted ? (
						<div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950">
							<p className="text-lg font-semibold text-green-800 dark:text-green-200">
								Thanks for reaching out! We&rsquo;ll be in touch.
							</p>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-6">
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
										placeholder="Kelly"
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
										placeholder="O'Malley"
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
										htmlFor="location"
										className="mb-2 block text-sm font-medium text-black dark:text-white"
									>
										Location
									</label>
									<input
										id="location"
										name="location"
										type="text"
										required
										placeholder="London, UK"
										className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
									/>
								</div>
							</div>
							<div>
								<label
									htmlFor="link"
									className="mb-2 block text-sm font-medium text-black dark:text-white"
								>
									LinkedIn / GitHub / Portfolio
								</label>
								<input
									id="link"
									name="link"
									type="url"
									required
									placeholder="https://www.linkedin.com/in/kellyomalley/"
									className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
								/>
							</div>
							<div>
								<label
									htmlFor="currentlyWorkingOn"
									className="mb-2 block text-sm font-medium text-black dark:text-white"
								>
									Currently working on
								</label>
								<textarea
									id="currentlyWorkingOn"
									name="currentlyWorkingOn"
									rows={4}
									required
									placeholder="What are you doing now?"
									className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
								/>
							</div>
							<div>
								<label
									htmlFor="workingAtTldraw"
									className="mb-2 block text-sm font-medium text-black dark:text-white"
								>
									Working at tldraw
								</label>
								<textarea
									id="workingAtTldraw"
									name="workingAtTldraw"
									rows={4}
									required
									placeholder="What work are you interested in doing?"
									className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
								/>
							</div>
							<div>
								<label
									htmlFor="whyTldraw"
									className="mb-2 block text-sm font-medium text-black dark:text-white"
								>
									Why tldraw?
								</label>
								<textarea
									id="whyTldraw"
									name="whyTldraw"
									rows={4}
									required
									placeholder="What interests you about tldraw specifically?"
									className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 outline-none transition-colors focus:border-brand-blue dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
								/>
							</div>
							<button
								type="submit"
								className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
							>
								Submit
							</button>
						</form>
					)}
				</div>
			</div>
		</div>
	)
}
