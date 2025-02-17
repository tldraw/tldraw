'use client'

import { useLocalStorageState } from '@/utils/storage'
import { ArrowRightCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

export function TalkToMe() {
	const [didDismiss, setDidDismiss] = useLocalStorageState('devrel-survey', false)

	if (didDismiss) return null

	return (
		<div className="fixed z-[1000] bottom-2 right-2 h-fit flex justify-items-end">
			<div className=" right-2 bottom-2 flex flex-row w-fit items-center gap-2 pl-0 pr-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-gray-200 rounded-lg shadow-lg overflow-hidden text-nowrap">
				<button
					className="w-auto pl-3 pr-1 h-full flex items-center opacity-[.618] cursor-pointer flex-shrink-0 hover:opacity-[1]"
					onClick={() => setDidDismiss(true)}
				>
					<XMarkIcon className="w-3 h-3" />
				</button>
				<Link
					className="flex flex-row gap-2 items-center"
					href="https://tldraw.typeform.com/developers?utm_source=landing-page&utm_medium=banner&utm_campaign=devrelsurvey"
					target="_blank"
					onClick={() => setDidDismiss(true)}
				>
					Take our developer survey
					<ArrowRightCircleIcon className="w-4 h-4 flex-shrink-0" />
				</Link>
			</div>
		</div>
	)
}
