'use client'

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MinusIcon, PlusIcon } from '@heroicons/react/20/solid'
import { track } from '@vercel/analytics'
import { ReactNode } from 'react'

export function DisclosureToggle({ q, a }: { q: string; a: ReactNode }) {
	return (
		<Disclosure
			as="div"
			className="w-full py-8 border-b border-zinc-100 first-of-type:pt-0 last-of-type:pb-0 last-of-type:border-b-0"
			onClick={() => track('faq', { question: q })}
		>
			<DisclosureButton className="group w-full flex items-start justify-between gap-8 text-black dark:text-white">
				<div className="font-semibold text-left">{q}</div>
				<PlusIcon className="shrink-0 h-5 mt-0.5 group-data-[open]:hidden" />
				<MinusIcon className="shrink-0 h-5 mt-0.5 hidden group-data-[open]:block" />
			</DisclosureButton>
			<DisclosurePanel className="pt-4 pr-8">{a}</DisclosurePanel>
		</Disclosure>
	)
}
