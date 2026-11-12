import { Tabs as _Tabs } from 'radix-ui'
import {
	type ReactNode,
	type WheelEvent,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { defineMessages, useEditor, useTranslation } from 'tldraw'
import type { LibraryGroup } from './library-groups'

const messages = defineMessages({
	owners: { id: 'libraries.tabs.label', defaultMessage: 'Library owners' },
	other: { id: 'libraries.tabs.other', defaultMessage: 'Other' },
})

/** The tab value of an owner's group. Libraries without a known owner share the empty one. */
export function getTabValue(key: string | undefined) {
	return key ?? ''
}

/** A tab per owner. Each child is a {@link LibraryTabPanel}. */
export function LibraryTabs({
	groups,
	value,
	onValueChange,
	children,
}: {
	groups: LibraryGroup[]
	value: string
	onValueChange(value: string): void
	children: ReactNode
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const label = (group: LibraryGroup) => group.label ?? msg(messages.other)
	const listRef = useRef<HTMLDivElement | null>(null)
	const [overflow, setOverflow] = useState({ start: false, end: false })

	const measureOverflow = () => {
		const list = listRef.current
		if (!list) return
		const start = list.scrollLeft > 0.5
		const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 0.5
		setOverflow((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
	}

	useEffect(() => {
		const list = listRef.current
		if (!list) return
		const observer = new ResizeObserver(measureOverflow)
		observer.observe(list)
		for (const tab of list.children) observer.observe(tab)
		return () => observer.disconnect()
	}, [groups])

	const hasCentred = useRef(false)
	useLayoutEffect(() => {
		const list = listRef.current
		const tab = list?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
		if (!list || !tab) return
		const animate = hasCentred.current && editor.user.getAnimationSpeed() > 0
		hasCentred.current = true
		list.scrollTo({
			left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2,
			behavior: animate ? 'smooth' : 'auto',
		})
	}, [editor, value])

	const scrollSideways = (e: WheelEvent<HTMLDivElement>) => {
		if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY
	}

	return (
		<_Tabs.Root className="tlui-libraries-tabs" value={value} onValueChange={onValueChange}>
			<div
				className="tlui-libraries-tabs__bar"
				data-overflow-start={overflow.start}
				data-overflow-end={overflow.end}
			>
				<_Tabs.List
					ref={listRef}
					className="tlui-libraries-tabs__list"
					aria-label={msg(messages.owners)}
					onWheel={scrollSideways}
					onScroll={measureOverflow}
				>
					{groups.map((group) => (
						<_Tabs.Trigger
							key={getTabValue(group.key)}
							value={getTabValue(group.key)}
							className="tlui-libraries-tabs__tab"
							title={label(group)}
						>
							<span className="tlui-libraries-tabs__label">{label(group)}</span>
						</_Tabs.Trigger>
					))}
				</_Tabs.List>
			</div>
			{children}
		</_Tabs.Root>
	)
}

export function LibraryTabPanel({ value, children }: { value: string; children: ReactNode }) {
	return (
		<_Tabs.Content value={value} className="tlui-libraries-sections">
			{children}
		</_Tabs.Content>
	)
}
