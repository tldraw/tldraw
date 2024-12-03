'use client'

import Image from 'next/image'
import { lazy, Suspense, useCallback, useState } from 'react'
import LgBc from '../../public/images/ui-placeholder/lg-bc.jpg'
import LgBl from '../../public/images/ui-placeholder/lg-bl.jpg'
import LgTl from '../../public/images/ui-placeholder/lg-tl.jpg'
import LgTr from '../../public/images/ui-placeholder/lg-tr.jpg'
import SmBc from '../../public/images/ui-placeholder/sm-bc.jpg'
import SmTl from '../../public/images/ui-placeholder/sm-tl.jpg'
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
	}, [])

	return (
		<div className="relative w-full border-t-[4px] border-b-[4px] md:border-[4px] border-blue-500 h-96 md:rounded-br-[16px] md:rounded-bl-[16px] md:rounded-tl-[16px] md:rounded-tr-[20px] sm:h-[40rem] max-h-[80vh] overflow-hidden">
			<Suspense fallback={<FakeTldraw isLoading={isLoading} onClick={handleSkeletonClick} />}>
				<DemoTldraw hidden={!showCanvas} />
			</Suspense>
			{!showCanvas && <FakeTldraw isLoading={isLoading} onClick={handleSkeletonClick} />}
		</div>
	)
}

function FakeTldraw({ onClick, isLoading }: { onClick(): void; isLoading: boolean }) {
	return (
		<div className="absolute inset-0 z-5 bg-[#FBFCFE] cursor-pointer" onClick={onClick}>
			<Image
				src={LgTl}
				alt="Tldraw UI"
				className="absolute top-0 left-0 w-[220px] h-auto hidden sm:block"
			/>
			<Image
				src={LgBl}
				alt="Tldraw UI"
				className="absolute bottom-0 left-0 w-[100px] h-auto hidden sm:block"
			/>
			<Image
				src={LgBc}
				alt="Tldraw UI"
				className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[450px] h-auto hidden sm:block"
			/>
			<Image
				src={LgTr}
				alt="Tldraw UI"
				className="absolute top-0 right-0 w-[164px] h-auto hidden md:block"
			/>
			<Image
				src={SmTl}
				alt="Tldraw UI"
				className="absolute top-0 left-0 w-[164px] h-auto sm:hidden"
			/>
			<Image
				src={SmBc}
				alt="Tldraw UI"
				className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[350px] h-auto sm:hidden"
			/>
			<div className="absolute inset-0 bg-[#FBFCFE]/50 flex items-center justify-center">
				<Button
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
