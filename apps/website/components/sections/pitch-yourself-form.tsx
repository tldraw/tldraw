'use client'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
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
		<div className="border-b border-zinc-200 py-10 sm:py-14 dark:border-zinc-800">
			<div className="flex flex-col gap-8 lg:flex-row lg:gap-8">
				{/* Left column - heading and description (matches FAQ section layout) */}
				<div className="lg:w-1/2">
					<h2 className="text-2xl font-semibold text-black sm:text-[32px] dark:text-white">
						{title}
					</h2>
					<p className="text-body mt-4 text-sm leading-relaxed whitespace-pre-line lg:mt-6 dark:text-zinc-400">
						{description}
					</p>
				</div>
				{/* Right column - form */}
				<div className="lg:w-1/2">
					{submitted ? (
						<div className="rounded-md border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950">
							<p className="text-lg font-semibold text-green-800 dark:text-green-200">
								Thanks for reaching out! We&rsquo;ll be in touch.
							</p>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="grid gap-6 sm:grid-cols-2">
								<FormField
									label="First name"
									id="firstName"
									name="firstName"
									required
									placeholder="Kelly"
								/>
								<FormField
									label="Last name"
									id="lastName"
									name="lastName"
									required
									placeholder="O'Malley"
								/>
							</div>
							<div className="grid gap-6 sm:grid-cols-2">
								<FormField
									label="Email"
									id="email"
									name="email"
									type="email"
									required
									placeholder="hello@tldraw.com"
								/>
								<FormField
									label="Location"
									id="location"
									name="location"
									required
									placeholder="London, UK"
								/>
							</div>
							<FormField
								label="LinkedIn / GitHub / Portfolio"
								id="link"
								name="link"
								type="url"
								required
								placeholder="https://www.linkedin.com/in/kellyomalley/"
							/>
							<FormField
								label="Currently working on"
								id="currentlyWorkingOn"
								name="currentlyWorkingOn"
								rows={4}
								required
								placeholder="What are you doing now?"
							/>
							<FormField
								label="Working at tldraw"
								id="workingAtTldraw"
								name="workingAtTldraw"
								rows={4}
								required
								placeholder="What work are you interested in doing?"
							/>
							<FormField
								label="Why tldraw?"
								id="whyTldraw"
								name="whyTldraw"
								rows={4}
								required
								placeholder="What interests you about tldraw specifically?"
							/>
							<Button type="submit">Submit</Button>
						</form>
					)}
				</div>
			</div>
		</div>
	)
}
