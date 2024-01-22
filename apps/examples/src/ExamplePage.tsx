import * as Accordion from '@radix-ui/react-accordion'
import { assert, assertExists } from '@tldraw/tldraw'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import ExamplesTldrawLogo from './components/ExamplesTldrawLogo'
import { ListLink } from './components/ListLink'
import { Example, examples } from './examples'

export function ExamplePage({
	example,
	children,
}: {
	example: Example
	children: React.ReactNode
}) {
	const scrollElRef = useRef<HTMLDivElement>(null)
	const activeElRef = useRef<HTMLLIElement>(null)
	const isFirstScroll = useRef(true)

	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			if (activeElRef.current) {
				const scrollEl = assertExists(scrollElRef.current)
				const activeEl = activeElRef.current
				assert(activeEl.offsetParent === scrollEl)

				const isScrolledIntoView =
					activeEl.offsetTop >= scrollEl.scrollTop &&
					activeEl.offsetTop + activeEl.offsetHeight <= scrollEl.scrollTop + scrollEl.offsetHeight

				if (!isScrolledIntoView) {
					activeEl.scrollIntoView({
						behavior: isFirstScroll.current ? 'auto' : 'smooth',
						block: isFirstScroll.current ? 'start' : 'center',
					})
				}
				isFirstScroll.current = false
			}
		})
		return () => cancelAnimationFrame(frame)
	}, [example])

	const categories = examples.map((e) => e.id)

	return (
		<div className="example">
			<div className="example__info">
				<Link className="example__logo" to="/">
					<ExamplesTldrawLogo /> examples
				</Link>
				<Accordion.Root
					type="multiple"
					defaultValue={categories}
					className="example__info__list scroll-light"
					ref={scrollElRef}
				>
					{categories.map((c) => (
						<Accordion.Item key={c} value={c}>
							<Accordion.Trigger className="accordion__trigger">{c}</Accordion.Trigger>
							<Accordion.Content>
								{examples
									.find((e) => e.id === c)
									?.array.map((e) => (
										<ListLink
											key={e.path}
											example={e}
											isActive={e.path === example.path}
											ref={e.path === example.path ? activeElRef : undefined}
										/>
									))}
							</Accordion.Content>
						</Accordion.Item>
					))}
				</Accordion.Root>
			</div>
			<div className="example__content">{children}</div>
		</div>
	)
}
