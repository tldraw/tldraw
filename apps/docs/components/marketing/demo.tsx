'use client'

import { lazy, Suspense } from 'react'

export function Demo() {
	const skeletonTldraw = <div className="absolute inset-0 bg-[#FBFCFE] cursor-pointer" />

	return (
		<div className="w-full border-t-[4px] border-b-[4px] md:border-[4px] border-blue-500 h-96 md:rounded-br-[16px] md:rounded-bl-[16px] md:rounded-tl-[16px] md:rounded-tr-[20px] sm:h-[40rem] max-h-[80vh] overflow-hidden">
			<Suspense fallback={skeletonTldraw}>
				<DemoTldraw />
			</Suspense>
		</div>
	)
}

const DemoTldraw = lazy(() => import('./DemoTldraw'))
