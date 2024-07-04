import { cn } from '@/utils/cn'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { MagnifyingGlassIcon as MagnifyingGlassIconSmall } from '@heroicons/react/20/solid'
import {
	MagnifyingGlassIcon as MagnifyingGlassIconLarge,
	XMarkIcon,
} from '@heroicons/react/24/solid'

export const SearchButton: React.FC<{
	type: 'docs' | 'blog'
	layout: 'mobile' | 'desktop'
	className?: string
}> = ({ type, layout, className }) => {
	return (
		<Popover className={cn('group', className)}>
			<PopoverButton
				className={cn(
					'flex items-center text-black',
					layout === 'desktop' &&
						'w-full h-10 justify-between bg-zinc-50 px-4 cursor-text hover:bg-zinc-100 rounded-lg',
					layout === 'mobile' &&
						'w-8 h-8 justify-center rounded focus:outline-none focus:bg-zinc-100'
				)}
			>
				<div className="flex items-center gap-3">
					<MagnifyingGlassIconSmall className={cn('h-4', layout === 'mobile' && 'hidden')} />
					<MagnifyingGlassIconLarge
						className={cn('h-6 group-data-[open]:hidden', layout === 'desktop' && 'hidden')}
					/>
					<XMarkIcon className="h-6 hidden group-data-[open]:block" />
					<span className={cn('capitalize text-sm text-zinc-400', layout === 'mobile' && 'hidden')}>
						Search {type}...
					</span>
				</div>
				<span className={cn('text-xs', layout === 'mobile' && 'hidden')}>⌘K</span>
			</PopoverButton>
			<PopoverPanel className="fixed left-0 z-10 top-14 sm:top-12 bg-white w-screen h-screen px-5 py-8 flex justify-center text-rose-600">
				Search: WIP
			</PopoverPanel>
		</Popover>
	)
}
