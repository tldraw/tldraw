import { assert, assertExists } from '@tldraw/tldraw'
import { ForwardedRef, forwardRef, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import ExamplesTldrawLogo from './components/ExamplesTldrawLogo'
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

	const categories = examples.map((e) => e.id)

	return (
		<div className="example">
			<div className="example__sidebar scroll-light">
				<div className="example__sidebar__header">
					<Link className="example__sidebar__header__logo" to="/">
						<ExamplesTldrawLogo />
					</Link>
					<div className="example__sidebar__header__socials">
						<a href="https://twitter.com/tldraw" title="twitter" className="hoverable">
							<SocialIcon icon="twitter" />
						</a>
						<a href="https://github.com/tldraw/tldraw" title="github" className="hoverable">
							<SocialIcon icon="github" />
						</a>
						<a href="https://discord.com/invite/SBBEVCA4PG" title="discord" className="hoverable">
							<SocialIcon icon="discord" />
						</a>
					</div>
				</div>
				<ul className="example__sidebar__categories scroll-light" ref={scrollElRef}>
					{categories.map((currentCategory) => (
						<li className="example__sidebar__category">
							<h3 className="example__sidebar__category__header">{currentCategory}</h3>
							<ul className="example__sidebar__category__items">
								{examples
									.find((category) => category.id === currentCategory)
									?.value.map((sidebarExample) => (
										<ExampleSidebarListItem
											key={sidebarExample.path}
											example={sidebarExample}
											isActive={sidebarExample.path === example.path}
											ref={sidebarExample.path === example.path ? activeElRef : undefined}
										/>
									))}
							</ul>
						</li>
					))}
				</ul>
				<div className="example__sidebar__footer-links">
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

export const ExampleSidebarListItem = forwardRef(function ExampleSidebarListItem(
	{
		example,
		isActive,
	}: { example: Example; isActive?: boolean; showDescriptionWhenInactive?: boolean },
	ref: ForwardedRef<HTMLLIElement>
) {
	return (
		<li ref={ref} className="examples__sidebar__item" data-active={isActive}>
			<Link to={example.path} className="examples__sidebar__item__link hoverable" />
			<h3 className="examples__sidebar__item__title">
				<span>{example.title}</span>
			</h3>
			{isActive && (
				<Link
					to={`${example.path}/full`}
					className="examples__list__item__standalone hoverable"
					aria-label="Standalone"
					title="View standalone example"
				>
					<StandaloneIcon />
				</Link>
			)}
		</li>
	)
})

export function StandaloneIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg width="16" height="16" viewBox="0 0 30 30" fill="none" {...props}>
			<path
				d="M13 5H7C5.89543 5 5 5.89543 5 7V23C5 24.1046 5.89543 25 7 25H23C24.1046 25 25 24.1046 25 23V17M19 5H25M25 5V11M25 5L13 17"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
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
