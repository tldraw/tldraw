import { ArrowRightIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { Demo } from './demo'

export function DemoSection() {
	return (
		<div className="px-0 md:px-5 max-w-screen-xl w-full mx-auto">
			<Demo />
			<div className="w-full flex items-center justify-center md:justify-end text-md pt-4">
				<Link
					href="https://tldraw.com"
					className="flex gap-1 items-center hover:text-black transition-all duration-200"
				>
					<p>
						Try the flagship demo at <span className="text-blue-500">tldraw.com</span>{' '}
					</p>
					<ArrowRightIcon className="h-[16px]" />
				</Link>
			</div>
		</div>
	)
}
