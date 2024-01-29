import * as Accordion from '@radix-ui/react-accordion'
import { assert, assertExists } from '@tldraw/tldraw'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ExamplesLink } from './components/ExamplesLink'
import ExamplesTldrawLogo from './components/ExamplesTldrawLogo'
import { Chevron } from './components/Icons'
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
				<Accordion.Root
					type="multiple"
					defaultValue={categories}
					className="example__info__list scroll-light"
					ref={scrollElRef}
				>
					{categories.map((currentCategory) => (
						<Accordion.Item key={currentCategory} value={currentCategory}>
							<Accordion.Trigger className="accordion__trigger">
								<div className="examples__list__item accordion__trigger__container">
									<h3 className="accordion__trigger__heading">{currentCategory}</h3>
									<Chevron />
								</div>
							</Accordion.Trigger>
							<Accordion.Content className="accordion__content">
								<span className="accordion__content__separator"></span>
								<div className="accordion__content__examples">
									{examples
										.find((category) => category.id === currentCategory)
										?.value.map((sidebarExample) => (
											<ExamplesLink
												key={sidebarExample.path}
												example={sidebarExample}
												isActive={sidebarExample.path === example.path}
												ref={sidebarExample.path === example.path ? activeElRef : undefined}
											/>
										))}
								</div>
							</Accordion.Content>
						</Accordion.Item>
					))}
				</Accordion.Root>
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
