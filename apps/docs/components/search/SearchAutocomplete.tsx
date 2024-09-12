import { SearchEntry } from '@/utils/algolia'
import { Combobox, ComboboxItem, ComboboxProvider, VisuallyHidden } from '@ariakit/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import * as Dialog from '@radix-ui/react-dialog'
import { Hit } from 'instantsearch.js'
import Link from 'next/link'
import { Fragment, useMemo, useState } from 'react'
import { Highlight } from 'react-instantsearch'
import { twJoin } from 'tailwind-merge'
import { assertExists } from 'tldraw'
import { ContentHighlight } from './ContentHighlight'

interface AutocompleteProps {
	items: Hit<SearchEntry>[]
	onChange(value: string): void
	onInputChange(value: string): void
	onClose(): void
}

export default function Autocomplete({
	items,
	onInputChange,
	onChange,
	onClose,
}: AutocompleteProps) {
	const [open, setOpen] = useState(true)
	const [value, setValue] = useState('')

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose()
		}
		setOpen(open)
	}

	return (
		<ComboboxProvider<string>
			defaultSelectedValue=""
			open={open}
			setOpen={setOpen}
			resetValueOnHide
			includesBaseElement={false}
			setValue={(newValue) => {
				setValue(newValue)
				onInputChange(newValue)
			}}
			setSelectedValue={(newValue) => onChange(newValue)}
		>
			<div
				className={twJoin(
					'fixed w-screen h-screen left-0 top-14 sm:top-[6.5rem] md:top-0',
					'bg-white/90 dark:bg-zinc-950/90 pointer-events-none'
				)}
			>
				<SearchDialog onOpenChange={handleOpenChange}>
					<div className="w-full max-w-3xl mx-auto px-5 lg:px-12 pt-[4.5rem]">
						<div
							className={twJoin(
								'pointer-events-auto bg-zinc-50 dark:bg-zinc-900 rounded-lg',
								'overflow-hidden focus-within:ring-2 focus-within:ring-blue-500'
							)}
						>
							<SearchInput value={value} />
							<Results items={useMemo(() => reorderItems(items), [items])} />
						</div>
					</div>
				</SearchDialog>
			</div>
		</ComboboxProvider>
	)
}

function SearchInput({ value }: { value: string }) {
	return (
		<div className="w-full h-10 flex items-center px-4">
			<div className="flex h-full grow items-center gap-3">
				<MagnifyingGlassIcon className="h-4 shrink-0" />
				<Combobox
					autoSelect
					className="h-full w-full mr-4 focus:outline-none text-black dark:text-white bg-transparent"
					value={value}
					autoFocus
				/>
			</div>
			<span className="hidden md:block text-xs shrink-0">ESC</span>
		</div>
	)
}

function Results({ items }: { items: Hit<SearchEntry>[] }) {
	let section = ''
	const renderedItems = items.map((hit) => {
		const showChapter = hit.section !== section
		section = hit.section

		const href = hit.headingSlug ? `${hit.path}#${hit.headingSlug}` : hit.path

		return (
			<Fragment key={hit.objectID}>
				{showChapter && (
					<div className="text-black dark:text-white font-semibold mt-6 mb-4">{section}</div>
				)}

				<ComboboxItem
					className={twJoin(
						'block px-4 pt-2.5 pb-3 bg-zinc-100 dark:bg-zinc-800 mt-2',
						'rounded-md cursor-pointer data-[active-item=true]:bg-blue-500',
						'dark:data-[active-item=true]:bg-blue-500 data-[active-item=true]:text-blue-200',
						'[&_mark]:bg-transparent [&_mark]:font-bold [&_mark]:text-white'
					)}
					value={href}
				>
					<Link href={href}>
						<Highlight
							attribute="title"
							hit={hit}
							className="text-black dark:text-white block-data-[active-item=true]:text-white"
						/>
						<ContentHighlight hit={hit} />
					</Link>
				</ComboboxItem>
			</Fragment>
		)
	})

	return (
		<div
			className={twJoin(
				'max-h-[32rem] overflow-y-auto p-4 pt-0',
				'border-t border-zinc-100 dark:border-zinc-800'
			)}
		>
			{items.length === 0 && (
				<div className="text-center py-8 text-zinc-400 dark:text-zinc-600">No results found.</div>
			)}
			{items.length !== 0 && renderedItems}
		</div>
	)
}

/**
 * We add section headings to the search results to make it easier to scan, but when results are
 * interspersed we end up with little groups of one or two, or we swap back and forth between
 * headings. It looks weird. We don't want to apply an absolute sort by section, but this function
 * tries to tweak the ordering in a small way to bring items together in cohesive sections.
 */
function reorderItems(items: Hit<SearchEntry>[]) {
	const MIN_GOOD_GROUP_SIZE = 3
	const MAX_HOIST_DISTANCE = 3

	const sections: { name: string; items: Hit<SearchEntry>[] }[] = []
	const currentSection = () => assertExists(sections[sections.length - 1])

	// initially, just group by section:
	for (const item of items) {
		if (sections.length === 0 || currentSection().name !== item.section) {
			sections.push({ name: item.section, items: [item] })
		} else {
			currentSection().items.push(item)
		}
	}

	// next, let's look at the sections and see if we can hoist/merge similar small sections:
	for (let i = 0; i < sections.length; i++) {
		const currentSection = sections[i]
		// skip sections already of good size:
		if (currentSection.items.length >= MIN_GOOD_GROUP_SIZE) continue

		// so we have a small section. let's back track past MAX_HOIST_DISTANCE items and see if we
		// can merge this section into an existing one:
		for (let j = i - 1, distance = 0; j >= 0 && distance <= MAX_HOIST_DISTANCE; j--) {
			const prevSection = sections[j]
			if (prevSection.name === currentSection.name) {
				// we've found a matching section, let's merge!
				prevSection.items.push(...currentSection.items)
				sections.splice(i, 1)
				i--
				break
			}

			// this is a different section, skip over it:
			distance += prevSection.items.length
		}
	}

	// finally, flatten the sections back into a single list:
	return sections.flatMap((section) => section.items)
}

function SearchDialog({
	children,
	onOpenChange,
}: {
	children: React.ReactNode
	onOpenChange(open: boolean): void
}) {
	return (
		<Dialog.Root open onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay />
				<Dialog.Content className="fixed inset-0 z-20" style={{ pointerEvents: 'none' }}>
					<VisuallyHidden>
						<Dialog.Title></Dialog.Title>
						<Dialog.Description></Dialog.Description>
					</VisuallyHidden>
					{children}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
