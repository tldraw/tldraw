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
	const basicExamples = examples.find((e) => e.id === 'basic')?.array || []
	const uiExamples = examples.find((e) => e.id === 'ui')?.array || []
	const shapeExamples = examples.find((e) => e.id === 'shapes/tools')?.array || []
	const editorExamples = examples.find((e) => e.id === 'editor')?.array || []
	const dataExamples = examples.find((e) => e.id === 'data')?.array || []

	const collaborationExamples = examples.find((e) => e.id === 'collaboration')?.array || []
	return (
		<div className="example">
			<div className="example__info">
				<Link className="example__logo" to="/">
					<ExamplesTldrawLogo /> examples
				</Link>
				<Accordion.Root
					type="multiple"
					defaultValue={['basic', 'ui', 'shapes', 'editor', 'data', 'collaboration']}
					className="example__info__list scroll-light"
					ref={scrollElRef}
				>
					{basicExamples && (
						<Accordion.Item value={'basic'}>
							<Accordion.Trigger className="accordion__trigger">Basic</Accordion.Trigger>
							<Accordion.Content>
								{basicExamples.map((e) => (
									<ListLink
										key={e.path}
										example={e}
										isActive={e.path === example.path}
										ref={e.path === example.path ? activeElRef : undefined}
									/>
								))}
							</Accordion.Content>
						</Accordion.Item>
					)}
					{uiExamples && (
						<Accordion.Item value={'ui'}>
							<Accordion.Trigger className="accordion__trigger">UI</Accordion.Trigger>
							<Accordion.Content>
								{uiExamples.map((e) => (
									<ListLink
										key={e.path}
										example={e}
										isActive={e.path === example.path}
										ref={e.path === example.path ? activeElRef : undefined}
									/>
								))}
							</Accordion.Content>
						</Accordion.Item>
					)}
					{shapeExamples && (
						<Accordion.Item value={'shapes'}>
							<Accordion.Trigger className="accordion__trigger">Shapes</Accordion.Trigger>
							<Accordion.Content>
								{shapeExamples.map((e) => (
									<ListLink
										key={e.path}
										example={e}
										isActive={e.path === example.path}
										ref={e.path === example.path ? activeElRef : undefined}
									/>
								))}
							</Accordion.Content>
						</Accordion.Item>
					)}
					{editorExamples && (
						<Accordion.Item value={'editor'}>
							<Accordion.Trigger className="accordion__trigger">Editor</Accordion.Trigger>
							<Accordion.Content>
								{editorExamples.map((e) => (
									<ListLink
										key={e.path}
										example={e}
										isActive={e.path === example.path}
										ref={e.path === example.path ? activeElRef : undefined}
									/>
								))}
							</Accordion.Content>
						</Accordion.Item>
					)}
					{dataExamples && (
						<Accordion.Item value={'data'}>
							<Accordion.Trigger className="accordion__trigger">Data</Accordion.Trigger>
							<Accordion.Content>
								{dataExamples.map((e) => (
									<ListLink
										key={e.path}
										example={e}
										isActive={e.path === example.path}
										ref={e.path === example.path ? activeElRef : undefined}
									/>
								))}
							</Accordion.Content>
						</Accordion.Item>
					)}
					{collaborationExamples && (
						<Accordion.Item value={'collaboration'}>
							<Accordion.Trigger className="accordion__trigger">Collaboration</Accordion.Trigger>
							<Accordion.Content>
								{collaborationExamples.map((e) => (
									<ListLink
										key={e.path}
										example={e}
										isActive={e.path === example.path}
										ref={e.path === example.path ? activeElRef : undefined}
									/>
								))}
							</Accordion.Content>
						</Accordion.Item>
					)}
				</Accordion.Root>
			</div>
			<div className="example__content">{children}</div>
		</div>
	)
}
