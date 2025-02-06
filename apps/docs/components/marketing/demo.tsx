'use client'

import LgBcDark from '@/public/images/ui-placeholder/lg-bc-dark.png'
import LgBc from '@/public/images/ui-placeholder/lg-bc.png'
import LgBlDark from '@/public/images/ui-placeholder/lg-bl-dark.png'
import LgBl from '@/public/images/ui-placeholder/lg-bl.png'
import LgTlDark from '@/public/images/ui-placeholder/lg-tl-dark.png'
import LgTl from '@/public/images/ui-placeholder/lg-tl.png'
import LgTrDark from '@/public/images/ui-placeholder/lg-tr-dark.png'
import LgTr from '@/public/images/ui-placeholder/lg-tr.png'
import SmBcDark from '@/public/images/ui-placeholder/sm-bc-dark.png'
import SmBc from '@/public/images/ui-placeholder/sm-bc.png'
import SmTlDark from '@/public/images/ui-placeholder/sm-tl-dark.png'
import SmTl from '@/public/images/ui-placeholder/sm-tl.png'
import { cn } from '@/utils/cn'
import { track } from '@vercel/analytics/react'
import Image from 'next/image'
import { lazy, Suspense, useCallback, useState } from 'react'
import { Button } from '../common/button'

// We start loading the editor immediately (lazily), but display a fake
// view first and require the user to click on it before we actually
// display the real editor. This is to prevent accidental interactions
// with the editor. If the user clicks the fake editor button before
// the canvas is completely loaded, then we display the fake editor
// with a loading state until it's ready.

export function Demo() {
	const [showCanvas, setShowCanvas] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState<boolean>(false)

	const handleSkeletonClick = useCallback(() => {
		setIsLoading(true)
		setShowCanvas(true)
		track('cta', { location: 'hero', type: 'demo' })
	}, [])

	return (
		<div className="relative w-full border-t-[4px] border-b-[4px] md:border-[4px] border-blue-500 h-96 md:rounded-br-[16px] md:rounded-bl-[16px] md:rounded-tl-[16px] md:rounded-tr-[20px] sm:h-[40rem] max-h-[80vh] overflow-hidden my-5">
			<Suspense fallback={<FakeTldraw isLoading={isLoading} onClick={handleSkeletonClick} />}>
				<DemoTldraw hidden={!showCanvas} />
			</Suspense>
			{!showCanvas && <FakeTldraw isLoading={isLoading} onClick={handleSkeletonClick} />}
		</div>
	)
}

const classes = {
	tl: 'absolute top-0 left-0 scale-50 origin-top-left',
	tr: 'absolute top-0 right-0 scale-50 origin-top-right',
	bl: 'absolute bottom-0 left-0 scale-50 origin-bottom-left',
	bc: 'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4 scale-50',
}

function FakeTldraw({ onClick, isLoading }: { onClick(): void; isLoading: boolean }) {
	return (
		<div
			className="absolute inset-0 z-5 bg-[#FBFCFE] dark:bg-[#101011] cursor-pointer"
			onClick={onClick}
			role="img"
			aria-label="Tldraw UI"
		>
			<div className="dark:hidden">
				<Image
					src={LgTl}
					role="presentation"
					alt=""
					className={cn('hidden sm:block', classes.tl)}
				/>
				<Image
					src={LgBl}
					role="presentation"
					alt=""
					className={cn('hidden sm:block', classes.bl)}
				/>
				<Image
					src={LgBc}
					role="presentation"
					alt=""
					className={cn('hidden sm:block', classes.bc)}
				/>
				<Image
					src={LgTr}
					role="presentation"
					alt=""
					className={cn('hidden md:block', classes.tr)}
				/>
				<Image src={SmTl} role="presentation" alt="" className={cn('sm:hidden', classes.tl)} />
				<Image src={SmBc} role="presentation" alt="" className={cn('sm:hidden', classes.bc)} />
			</div>
			<div className="hidden dark:block">
				<Image
					src={LgTlDark}
					role="presentation"
					alt=""
					className={cn('hidden sm:block', classes.tl)}
				/>
				<Image
					src={LgBlDark}
					role="presentation"
					alt=""
					className={cn('hidden sm:block', classes.bl)}
				/>
				<Image
					src={LgBcDark}
					role="presentation"
					alt=""
					className={cn('hidden sm:block', classes.bc)}
				/>
				<Image
					src={LgTrDark}
					role="presentation"
					alt=""
					className={cn('hidden md:block', classes.tr)}
				/>
				<Image src={SmTlDark} role="presentation" alt="" className={cn('sm:hidden', classes.tl)} />
				<Image src={SmBcDark} role="presentation" alt="" className={cn('sm:hidden', classes.bc)} />
			</div>
			<div className="absolute inset-0 bg-[#FBFCFE]/50 dark:bg-[#101011]/50 flex items-center justify-center">
				<Button
					id="hero-demo"
					onClick={onClick}
					caption={isLoading ? 'Loading…' : 'Try it'}
					icon="play"
					className="shadow"
				/>
			</div>
		</div>
	)
}

const DemoTldraw = lazy(() => import('./DemoTldraw'))
