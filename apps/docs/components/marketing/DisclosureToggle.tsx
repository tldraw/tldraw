'use client'

import { track } from '@/app/analytics'
import { cn } from '@/utils/cn'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MinusIcon, PlusIcon } from '@heroicons/react/20/solid'
import { ReactNode } from 'react'

export function DisclosureToggle({ q, a, index }: { q: string; a: ReactNode; index: number }) {
	return (
		<Disclosure
			as="div"
			className={cn(
				'w-full border-b border-zinc-100 first-of-type:pt-0 last-of-type:pb-0 last-of-type:border-b-0',
				index === 0 ? 'mt-[-8]' : ''
			)}
			onClick={() => track('faq', { question: q })}
		>
			<DisclosureButton className="group py-8 w-full flex items-start justify-between gap-8 text-black dark:text-white">
				<div className="font-semibold text-left">{q}</div>
				<PlusIcon className="shrink-0 h-5 mt-0.5 group-data-[open]:hidden" />
				<MinusIcon className="shrink-0 h-5 mt-0.5 hidden group-data-[open]:block" />
			</DisclosureButton>
			<DisclosurePanel className="pt-0 pr-8 pb-8">{a}</DisclosurePanel>
		</Disclosure>
	)
}
