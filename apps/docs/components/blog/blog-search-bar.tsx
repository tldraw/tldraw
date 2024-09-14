'use client'

import { SearchButton } from '@/components/search/SearchButton'
import { motion, useScroll, useTransform } from 'framer-motion'

export function BlogSearchBar() {
	const { scrollY } = useScroll()
	const width = useTransform(scrollY, [0, 32], ['100%', '60%'])
	const offset = useTransform(scrollY, [0, 32], ['15rem', '0rem'])

	return (
		<motion.div
			className="hidden md:flex mx-auto px-5 sticky top-4 z-10 xl:max-w-3xl xl:px-0"
			style={{ width }}
		>
			<motion.div className="hidden lg:block xl:hidden shrink-0" style={{ width: offset }} />
			<div className="lg:max-w-3xl lg:pl-12 xl:pr-12 grow">
				<SearchButton type="blog" layout="desktop" />
			</div>
		</motion.div>
	)
}
