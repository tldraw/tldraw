'use client'

import { useInView } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import CustomUI from '../../public/images/ui-placeholder/custom-ui.jpg'

export function ExamplePlaceholder({ children }: { children: React.ReactNode }) {
	const container = useRef<HTMLDivElement>(null)
	const inView = useInView(container, { amount: 1 })
	const [placeholder, setPlaceholder] = useState(true)

	useEffect(() => {
		if (inView) setPlaceholder(false)
	}, [inView])

	if (placeholder)
		return (
			<div ref={container} className="relative w-full h-full pointer-events-none">
				<Image src={CustomUI} alt="Tldraw Custom UI" fill className="object-cover object-top" />
			</div>
		)
	return children
}
