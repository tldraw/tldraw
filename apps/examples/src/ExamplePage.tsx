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
	const scrollElRef = useRef<HTMLUListElement>(null)
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
	return (
		<div className="example">
			<div className="example__info">
				<Link className="example__logo" to="/">
					<ExamplesTldrawLogo /> examples
				</Link>
				<ul className="example__info__list scroll-light" ref={scrollElRef}>
					{examples.map((e, i) => (
						<li key={'exampleli ' + i}>
							<ul key={'exampleul' + i}>
								{e
									.filter((item) => !item.hide)
									.map((item) => (
										<ListLink
											key={item.path}
											ref={item.path === example.path ? activeElRef : undefined}
											example={item}
											isActive={item.path === example.path}
										/>
									))}
							</ul>
						</li>
					))}
					<li>
						<hr />
					</li>
				</ul>
			</div>
			<div className="example__content">{children}</div>
		</div>
	)
}
