'use client'

import { Button } from '@/components/common/button'
import { requestLicense } from '@/utils/request-license'
import { Field, Input, Label, Select, Textarea } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/16/solid'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { useFormState } from 'react-dom'

export const RequestForm = () => {
	const [showForm, setShowForm] = useState(false)
	const formState = { error: '', success: false }
	const [state, action] = useFormState(requestLicense, formState)

	return (
		<div>
			<div className="flex flex-col items-start sm:flex-row sm:items-end gap-6 justify-between border-t border-zinc-700/50 pt-6 mt-6">
				<ul className="space-y-2">
					<li className="flex items-center gap-2">
						<CheckIcon className="h-4 shrink-0 text-blue-400" />
						<span>No watermark on the canvas</span>
					</li>
					<li className="flex items-center gap-2">
						<CheckIcon className="h-4 shrink-0 text-blue-400" />
						<span>Support from our team</span>
					</li>
					<li className="flex items-center gap-2">
						<CheckIcon className="h-4 shrink-0 text-blue-400" />
						<span>Prioritized feature request</span>
					</li>
				</ul>
				{!showForm && (
					<Button onClick={() => setShowForm(true)} caption="Request commercial license" />
				)}
			</div>
			{showForm && (
				<form
					action={action}
					className="pt-6 mt-6 border-t border-zinc-700/50 grid grid-cols-1 sm:grid-cols-2 gap-4"
				>
					<h3 className="text-white font-semibold sm:col-span-2 pb-2">
						Request your Commercial License
					</h3>
					<Field>
						<Label className="sr-only">Email-Address</Label>
						<Input
							name="email"
							type="email"
							placeholder="Your Email-Address *"
							required
							className="w-full h-9 px-4 rounded-lg text-white bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900"
						/>
					</Field>
					<Field>
						<Label className="sr-only">Name</Label>
						<Input
							name="name"
							type="text"
							placeholder="Your Name"
							className="w-full h-9 px-4 rounded-lg text-white bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900"
						/>
					</Field>
					<Field>
						<Label className="sr-only">Location</Label>
						<Input
							name="location"
							type="text"
							placeholder="Location *"
							required
							className="w-full h-9 px-4 rounded-lg text-white bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900"
						/>
					</Field>
					<Field>
						<Label className="sr-only">Company</Label>
						<Input
							name="company"
							type="text"
							placeholder="Company Name"
							className="w-full h-9 px-4 rounded-lg text-white bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900"
						/>
					</Field>
					<Field className="relative">
						<Label className="sr-only">Your Role</Label>
						<Select
							name="role"
							className="w-full h-9 px-4 appearance-none rounded-lg text-white bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900"
						>
							<option value="">Your Role...</option>
							<option>CEO</option>
							<option>CTO</option>
							<option>Developer</option>
							<option>Product designer</option>
							<option>Other</option>
						</Select>
						<ChevronDownIcon className="size-5 text-zinc-300 absolute right-2 top-2 pointer-events-none" />
					</Field>
					<Field className="relative">
						<Label className="sr-only">Company Size</Label>
						<Select
							name="size"
							className="w-full h-9 px-4 appearance-none rounded-lg text-white bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900"
						>
							<option value="">Company Size...</option>
							<option>1</option>
							<option>2 – 10</option>
							<option>11 – 50</option>
							<option>51 – 100</option>
							<option>100+</option>
						</Select>
						<ChevronDownIcon className="size-5 text-zinc-300 absolute right-2 top-2 pointer-events-none" />
					</Field>
					<Field className="sm:col-span-2">
						<Label className="sr-only">Usage</Label>
						<Textarea
							name="usage"
							placeholder="How do you plan to use tldraw?"
							rows={4}
							className="-mb-1.5 w-full px-4 py-2 rounded-lg resize-none text-white bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900"
						/>
					</Field>
					<Field className="relative sm:col-span-2">
						<Label className="sr-only">Project Type</Label>
						<Select
							name="type"
							className="w-full h-9 px-4 appearance-none rounded-lg text-white bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900"
						>
							<option value="">Type of Project...</option>
							<option>Customer-facing product</option>
							<option>Internal product</option>
							<option>Project for a client</option>
							<option>OEM / integration into a different SDK</option>
						</Select>
						<ChevronDownIcon className="size-5 text-zinc-300 absolute right-2 top-2 pointer-events-none" />
					</Field>
					<div className="sm:col-span-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
						<div>
							{state.error && (
								<p className="text-sm text-red-400">
									<XMarkIcon className="h-4 inline-block mb-0.5" /> <span>{state.error}</span>
								</p>
							)}
							{state.success && (
								<p className="text-sm text-emerald-400">
									<CheckIcon className="h-4 inline-block mb-0.5" /> <span>Thank you!</span>
								</p>
							)}
						</div>
						<Button submit caption="Submit request" arrow="right" darkRingOffset />
					</div>
				</form>
			)}
		</div>
	)
}
