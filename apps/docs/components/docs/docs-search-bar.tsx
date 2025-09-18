'use client'

import { SearchButton } from '@/components/search/SearchButton'
import { motion } from 'framer-motion'

export function DocsSearchBar() {
	return (
		<motion.div
			className="hidden md:flex mx-auto px-5 sticky top-4 z-10 xl:max-w-3xl xl:px-0"
			style={{ width: '55%', marginTop: '-56px' }}
		>
			<div className="lg:max-w-3xl lg:pl-12 lg:pr-12 grow">
				<SearchButton type="docs" layout="desktop" />
			</div>
		</motion.div>
	)
}
