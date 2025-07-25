import { SearchEntry } from '@/utils/algolia'
import { Combobox, ComboboxItem, ComboboxProvider, VisuallyHidden } from '@ariakit/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Hit } from 'instantsearch.js'
import { SendEventForHits } from 'instantsearch.js/es/lib/utils'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog as _Dialog } from 'radix-ui'
import { Fragment, startTransition, useState } from 'react'
import { Highlight } from 'react-instantsearch'
import { twJoin } from 'tailwind-merge'
import { ContentHighlight } from './ContentHighlight'

interface AutocompleteProps {
	items: Hit<SearchEntry>[]
	onChange(value: string): void
	onInputChange(value: string): void
	onClose(): void
	sendEvent: SendEventForHits
}

export default function SearchDialog({
	items,
	onInputChange,
	onChange,
	onClose,
	sendEvent,
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
				startTransition(() => {
					setValue(newValue)
					onInputChange(newValue)
				})
			}}
			setSelectedValue={(newValue) => onChange(newValue)}
		>
			<div
				className={twJoin(
					'fixed w-screen h-screen left-0 top-14 sm:top-[6.5rem] md:top-0 z-40',
					'bg-white/90 dark:bg-zinc-950/90 pointer-events-none'
				)}
			>
				<SearchDialogWrapper onOpenChange={handleOpenChange}>
					<div className="w-full max-w-3xl mx-auto px-5 lg:px-12 pt-[4.5rem]">
						<div
							className={twJoin(
								'pointer-events-auto bg-zinc-50 dark:bg-zinc-900 rounded-lg',
								'overflow-hidden focus-within:ring-2 focus-within:ring-blue-500'
							)}
						>
							<SearchInput value={value} />
							<Results items={items} sendEvent={sendEvent} />
						</div>
					</div>
				</SearchDialogWrapper>
			</div>
		</ComboboxProvider>
	)
}

function SearchInput({ value }: { value: string }) {
	const router = useRouter()
	const pathName = usePathname()
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== 'Enter') return
		const searchPath = pathName.startsWith('/blog') ? '/search/blog' : '/search'
		router.push(`${searchPath}?query=${encodeURIComponent(value.trim())}`)
	}
	return (
		<div className="w-full h-10 flex items-center px-4">
			<div className="flex h-full grow items-center gap-3">
				<MagnifyingGlassIcon className="h-4 shrink-0" />
				<Combobox
					className="h-full w-full mr-4 focus:outline-none text-black dark:text-white bg-transparent"
					autoFocus
					placeholder="Search..."
					onKeyDown={handleKeyDown}
				/>
			</div>
		</div>
	)
}

function Results({ items, sendEvent }: { items: Hit<SearchEntry>[]; sendEvent: SendEventForHits }) {
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
						'px-4 pt-2.5 pb-3 bg-zinc-100 dark:bg-zinc-800 mt-2',
						'rounded-md cursor-pointer data-[active-item=true]:bg-blue-500',
						'dark:data-[active-item=true]:bg-blue-500 data-[active-item=true]:text-blue-200',
						'[&_mark]:bg-transparent [&_mark]:font-bold',
						'[&_mark]:text-black [&_mark]:data-[active-item=true]:text-white',
						'dark:[&_mark]:text-white',
						'[&_.ais-Highlight-nonHighlighted]:data-[active-item=true]:text-white',
						'hover:text-zinc-800 dark:hover:text-zinc-200'
					)}
					value={href}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							sendEvent('click', hit, 'Hit clicked via keyboard')
						}
					}}
				>
					<Link href={href} onClick={() => sendEvent('click', hit, 'Hit clicked')}>
						<Highlight attribute="title" hit={hit} />
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
				<div className="text-center py-8 text-zinc-400 dark:text-zinc-600">
					<p>No results found.</p>
					<p className="mt-2">
						Will you tell us what you{"'"}re looking for on our{' '}
						<a
							className="text-blue-500 hover:text-blue-600"
							target="_blank"
							href="https://discord.tldraw.com/?utm_source=blog&utm_medium=search&utm_campaign=no-results-found"
							rel="noreferrer"
						>
							discord
						</a>
						?
					</p>
				</div>
			)}
			{items.length !== 0 && renderedItems}
		</div>
	)
}

function SearchDialogWrapper({
	children,
	onOpenChange,
}: {
	children: React.ReactNode
	onOpenChange(open: boolean): void
}) {
	return (
		<_Dialog.Root open onOpenChange={onOpenChange}>
			<_Dialog.Portal>
				<_Dialog.Overlay />
				<_Dialog.Content className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
					<VisuallyHidden>
						<_Dialog.Title>Search</_Dialog.Title>
						<_Dialog.Description>Search dialog</_Dialog.Description>
					</VisuallyHidden>
					{children}
				</_Dialog.Content>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}
