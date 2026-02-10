'use client'

import { Button } from '@/components/ui/button'
import { ChevronRight } from '@/components/ui/chevron-icon'
import { FormField } from '@/components/ui/form-field'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
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
		<Section>
			<SectionHeading title={title} description={description} />

			{submitted ? (
				<div className="mt-10 rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950">
					<p className="text-lg font-semibold text-green-800 dark:text-green-200">
						Thanks for sharing! We&rsquo;ll take a look.
					</p>
				</div>
			) : (
				<form onSubmit={handleSubmit} className="mt-10 max-w-2xl space-y-6">
					<div className="grid gap-6 sm:grid-cols-2">
						<FormField label="First name" id="firstName" name="firstName" required />
						<FormField label="Last name" id="lastName" name="lastName" required />
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
						<FormField label="Link" id="link" name="link" type="url" placeholder="www.tldraw.com" />
					</div>
					<FormField
						label="Project description"
						id="projectDescription"
						name="projectDescription"
						rows={4}
						placeholder="What have you done?"
					/>
					<Button
						variant="blue"
						type="submit"
						className="flex w-full items-center justify-center gap-1.5 rounded-lg px-6 py-3 font-semibold sm:w-auto sm:min-w-[200px]"
					>
						Submit <ChevronRight />
					</Button>
				</form>
			)}
		</Section>
	)
}
