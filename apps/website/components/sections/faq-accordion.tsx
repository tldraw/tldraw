'use client'

import type { FaqItem } from '@/sanity/types'
import { PortableText } from '@portabletext/react'
import { useState } from 'react'

interface FAQAccordionProps {
	items: FaqItem[]
}

export function FAQAccordion({ items }: FAQAccordionProps) {
	const [openIndex, setOpenIndex] = useState<number | null>(null)

	return (
		<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
			{items.map((item, i) => (
				<div key={item._id} className="py-6">
					<button
						type="button"
						className="flex w-full items-center justify-between text-left"
						onClick={() => setOpenIndex(openIndex === i ? null : i)}
						aria-expanded={openIndex === i}
					>
						<span className="text-base font-semibold text-zinc-900 dark:text-white">
							{item.question}
						</span>
						<svg
							className={`h-5 w-5 flex-shrink-0 text-zinc-500 transition-transform ${
								openIndex === i ? 'rotate-180' : ''
							}`}
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="2"
							stroke="currentColor"
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
						</svg>
					</button>
					{openIndex === i && (
						<div className="prose prose-sm mt-4 dark:prose-invert">
							<PortableText value={item.answer} />
						</div>
					)}
				</div>
			))}
		</div>
	)
}
