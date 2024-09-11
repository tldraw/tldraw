'use client'

import Image from 'next/image'
import { lazy, Suspense, useState } from 'react'
import LgBc from '../../public/images/ui-placeholder/lg-bc.jpg'
import LgBl from '../../public/images/ui-placeholder/lg-bl.jpg'
import LgTl from '../../public/images/ui-placeholder/lg-tl.jpg'
import LgTr from '../../public/images/ui-placeholder/lg-tr.jpg'
import SmBc from '../../public/images/ui-placeholder/sm-bc.jpg'
import SmTl from '../../public/images/ui-placeholder/sm-tl.jpg'
import { Button } from '../common/button'

export function Demo() {
	const [showCanvas, setShowCanvas] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState<boolean>(false)

	const onClick = () => {
		setIsLoading(true)
		setShowCanvas(true)
	}

	const skeletonTldraw = (
		<div className="absolute inset-0 bg-[#FBFCFE] cursor-pointer" onClick={onClick}>
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

	return (
		<div className="w-full py-16">
			<div className="w-full bg-blue-500 py-1 md:rounded-2xl md:px-1 mt-1 h-96 sm:h-[40rem] max-h-[80vh]">
				<div className="relative w-full h-full overflow-hidden bg-white shadow md:rounded-xl">
					{!showCanvas && skeletonTldraw}
					<Suspense fallback={skeletonTldraw}>
						<DemoTldraw hidden={!showCanvas} />
					</Suspense>
				</div>
			</div>
		</div>
	)
}

const DemoTldraw = lazy(() => import('./DemoTldraw'))
