'use client'

import { useState } from 'react'

export interface FaqAccordionItem {
	question: string
	answer: string
}

// Grouped FAQ section with heading and description
export interface FaqAccordionSection {
	heading: string
	description: string
	items: FaqAccordionItem[]
}

interface FAQAccordionProps {
	items: FaqAccordionItem[]
}

interface FAQAccordionGroupedProps {
	sections: FaqAccordionSection[]
}

function AccordionItem({
	question,
	isOpen,
	onToggle,
	children,
}: {
	question: string
	isOpen: boolean
	onToggle(): void
	children: React.ReactNode
}) {
	return (
		<div>
			<button
				type="button"
				className={`flex w-full items-center justify-between pt-4 text-left ${isOpen ? 'pb-2' : 'pb-4'}`}
				onClick={onToggle}
				aria-expanded={isOpen}
			>
				<span className="text-sm leading-normal font-medium text-black dark:text-white">
					{question}
				</span>
				<svg
					className="text-brand-blue h-[18px] w-[18px] shrink-0"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth="1.5"
					stroke="currentColor"
				>
					{isOpen ? (
						<path strokeLinecap="round" d="M6 12h12" />
					) : (
						<path strokeLinecap="round" d="M12 6v12M6 12h12" />
					)}
				</svg>
			</button>
			{isOpen && (
				<div className="prose prose-sm text-body dark:prose-invert prose-a:text-brand-link prose-a:underline pb-4 dark:text-zinc-400">
					{children}
				</div>
			)}
		</div>
	)
}

function FaqAnswer({ answer }: { answer: string }) {
	return <p>{answer}</p>
}

export function FAQAccordion({ items }: FAQAccordionProps) {
	const [openIndex, setOpenIndex] = useState<number | null>(null)

	return (
		<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
			{items.map((item, i) => (
				<AccordionItem
					key={item.question}
					question={item.question}
					isOpen={openIndex === i}
					onToggle={() => setOpenIndex(openIndex === i ? null : i)}
				>
					<FaqAnswer answer={item.answer} />
				</AccordionItem>
			))}
		</div>
	)
}

/** Accordion grouped by sections with headings and descriptions, supports both string and PortableText answers */
export function FAQAccordionGrouped({ sections }: FAQAccordionGroupedProps) {
	// Default to first item of each section open
	const defaultOpenKeys = new Set<string>()
	for (const section of sections) {
		if (section.items.length > 0) {
			defaultOpenKeys.add(`${section.heading}:${section.items[0].question}`)
		}
	}
	const [openKeys, setOpenKeys] = useState<Set<string>>(defaultOpenKeys)

	function toggleKey(key: string) {
		setOpenKeys((prev) => {
			const next = new Set(prev)
			if (next.has(key)) {
				next.delete(key)
			} else {
				next.add(key)
			}
			return next
		})
	}

	return (
		<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
			{sections.map((section) => (
				<div key={section.heading} className="py-10 lg:py-14">
					<div className="flex flex-col gap-8 lg:flex-row lg:gap-8">
						<div className="pt-4 lg:w-1/2">
							<h2 className="text-2xl font-semibold text-black lg:text-3xl dark:text-white">
								{section.heading}
							</h2>
							<p className="text-body mt-4 text-sm leading-relaxed whitespace-pre-line lg:mt-6 dark:text-zinc-400">
								{section.description}
							</p>
						</div>
						<div className="lg:w-1/2">
							{section.items.map((item) => {
								const key = `${section.heading}:${item.question}`
								return (
									<AccordionItem
										key={key}
										question={item.question}
										isOpen={openKeys.has(key)}
										onToggle={() => toggleKey(key)}
									>
										<FaqAnswer answer={item.answer} />
									</AccordionItem>
								)
							})}
						</div>
					</div>
				</div>
			))}
		</div>
	)
}
