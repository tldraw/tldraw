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
				<div className="example__sidebar-header">
					<Link className="example__logo" to="/">
						<ExamplesTldrawLogo />
					</Link>
					<div className="example__info__list__socials">
						<a
							href="https://twitter.com/tldraw"
							className="example__info__list__socials__button"
							title="twitter"
						>
							<SocialIcon icon="twitter" />
						</a>
						<a
							href="https://github.com/tldraw/tldraw"
							className="example__info__list__socials__button"
							title="github"
						>
							<SocialIcon icon="github" />
						</a>
						<a
							href="https://discord.com/invite/SBBEVCA4PG"
							className="example__info__list__socials__button"
							title="discord"
						>
							<SocialIcon icon="discord" />
						</a>
					</div>
				</div>
				<ul className="example__info__list scroll-light" ref={scrollElRef}>
					{examples
						.filter((e) => !e.hide)
						.filter((e) => e.order !== null)
						.map((e) => (
							<ListLink
								key={e.path}
								ref={e.path === example.path ? activeElRef : undefined}
								example={e}
								isActive={e.path === example.path}
							/>
						))}
					<li>
						<hr />
					</li>
					{examples
						.filter((e) => !e.hide)
						.filter((e) => e.order === null)
						.map((e) => (
							<ListLink
								key={e.path}
								ref={e.path === example.path ? activeElRef : undefined}
								example={e}
								isActive={e.path === example.path}
							/>
						))}
				</ul>
				<div className="example__info__list__link">
					<a
						className="link__button link__button--grey"
						target="_blank"
						href="https://github.com/tldraw/tldraw/issues/new?assignees=&labels=Example%20Request&projects=&template=example_request.yml&title=%5BExample Request%5D%3A+"
					>
						Request an example
					</a>
					<a className="link__button link__button--grey" target="_blank" href="https://tldraw.dev">
						Visit the docs
					</a>
				</div>
			</div>
			<div className="example__content">{children}</div>
		</div>
	)
}

export function SocialIcon({ icon }: { icon: string }) {
	return (
		<img
			className="icon"
			src={`/icons/${icon}.svg`}
			style={{
				mask: `url(/icons/${icon}.svg) center 100% / 100% no-repeat`,
				WebkitMask: `url(/icons/${icon}.svg) center 100% / 100% no-repeat`,
			}}
		/>
	)
}
