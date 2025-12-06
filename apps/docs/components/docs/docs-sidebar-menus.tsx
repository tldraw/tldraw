'use client'

import { DocsSidebarMenu } from '@/components/docs/docs-sidebar-menu'
import { usePathname } from 'next/navigation'
import { UIEventHandler, useEffect, useRef } from 'react'

let scrollPosition = 0

export function DocsSidebarMenus({ menus }: { menus: any }) {
	const container = useRef<HTMLDivElement>(null)
	const pathname = usePathname()

	useEffect(() => {
		container.current?.scrollTo(0, scrollPosition)
		const elements = document.querySelectorAll(
			'.sidebar-link[data-active=true]'
		) as NodeListOf<HTMLElement>
		for (const element of elements) {
			const aboveView = container.current && element.offsetTop < container.current.scrollTop
			const belowView =
				container.current &&
				element.offsetTop > container.current.scrollTop + container.current.clientHeight
			if (!aboveView && !belowView) {
				return
			}
		}
		const element = elements[0]
		element?.scrollIntoView({ block: 'center' })
	}, [pathname])

	const onScroll: UIEventHandler<HTMLDivElement> = (e) => {
		e.stopPropagation()
		scrollPosition = container.current?.scrollTop ?? 0
	}

	return (
		<div ref={container} onScroll={onScroll} className="relative pr-12 overflow-y-auto grow">
			<div className="sticky top-0 w-full h-12 -mb-12 pointer-events-none bg-gradient-to-b from-white dark:from-zinc-950" />
			<div>
				{menus.map((menu: any, index: number) => (
					// @ts-ignore
					<DocsSidebarMenu key={index} title={menu.title} elements={menu.children} />
				))}
			</div>
			<div className="sticky bottom-0 w-full h-12 pointer-events-none bg-gradient-to-t from-white dark:from-zinc-950" />
		</div>
	)
}
