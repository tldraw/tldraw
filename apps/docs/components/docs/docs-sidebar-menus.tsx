'use client'

import { DocsSidebarMenu } from '@/components/docs/docs-sidebar-menu'
import { usePathname } from 'next/navigation'
import { UIEventHandler, useEffect, useRef } from 'react'

let scrollPosition = 0

export const DocsSidebarMenus = ({ menus }: { menus: any }) => {
	const container = useRef<HTMLDivElement>(null)
	const pathname = usePathname()

	useEffect(() => {
		container.current?.scrollTo(0, scrollPosition)
		const element = document.querySelector('.sidebar-link[data-active=true]') as HTMLElement
		const aboveView = container.current && element.offsetTop < container.current.scrollTop
		const belowView =
			container.current &&
			element.offsetTop > container.current.scrollTop + container.current.clientHeight
		if (aboveView || belowView) element.scrollIntoView({ block: 'center' })
	}, [pathname])

	const onScroll: UIEventHandler<HTMLDivElement> = (e) => {
		e.stopPropagation()
		scrollPosition = container.current?.scrollTop ?? 0
	}

	return (
		<div ref={container} onScroll={onScroll} className="relative grow overflow-y-auto pr-12">
			<div className="sticky top-0 h-12 -mb-12 w-full bg-gradient-to-b from-white dark:from-zinc-950" />
			<div>
				{menus.map((menu: any, index: number) => (
					// @ts-ignore
					<DocsSidebarMenu key={index} title={menu.title} elements={menu.children} />
				))}
			</div>
			<div className="sticky bottom-0 h-12 w-full bg-gradient-to-t from-white dark:from-zinc-950" />
		</div>
	)
}
