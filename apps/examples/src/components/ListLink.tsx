import classNames from 'classnames'
import { ForwardedRef, forwardRef, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Example } from '../examples'
import { useMergedRefs } from '../hooks/useMegedRefs'
import { StandaloneIcon } from './Icons'
import { Markdown } from './Markdown'

export const ListLink = forwardRef(function ListLink(
	{
		example,
		isActive,
		showDescription,
	}: { example: Example; isActive?: boolean; showDescription?: boolean },
	ref: ForwardedRef<HTMLLIElement>
) {
	const id = useId()
	const containerRef = useRef<HTMLLIElement | null>(null)
	const wasActiveRef = useRef(isActive)
	useEffect(() => {
		wasActiveRef.current = isActive
	}, [isActive])

	const heightBefore =
		wasActiveRef.current !== isActive ? containerRef.current?.offsetHeight : undefined

	useLayoutEffect(() => {
		if (heightBefore !== undefined && containerRef.current) {
			containerRef.current.animate(
				[{ height: heightBefore + 'px' }, { height: containerRef.current.offsetHeight + 'px' }],
				{
					duration: 120,
					easing: 'ease-out',
					fill: 'backwards',
					delay: 100,
				}
			)
		}
	}, [heightBefore])

	const mainDetails = (
		<>
			<h3 id={id}>
				{example.title}
				{isActive && (
					<Link
						to={`${example.path}/full`}
						aria-label="Standalone"
						className="examples__list__item__standalone"
						title="View standalone example"
					>
						<StandaloneIcon />
					</Link>
				)}
			</h3>
			{showDescription && <Markdown sanitizedHtml={example.description} />}
		</>
	)

	// TODO: re-enable code sandbox links
	// const codeSandboxPath = encodeURIComponent(
	// 	`/src/examples${example.path}${example.componentFile.replace(/^\./, '')}`
	// )
	const extraDetails = (
		<div className="examples__list__item__details" aria-hidden={!isActive}>
			<Markdown sanitizedHtml={example.details} />
			<div className="examples__list__item__code">
				<a href={example.codeUrl} target="_blank" rel="noreferrer">
					View code
				</a>
				{/* <a
					href={`https://codesandbox.io/p/devbox/github/tldraw/tldraw/tree/examples/?file=${codeSandboxPath}`}
					target="_blank"
					rel="noreferrer"
				>
					Edit in CodeSandbox
				</a> */}
			</div>
		</div>
	)

	return (
		<li
			ref={useMergedRefs(ref, containerRef)}
			className={classNames('examples__list__item', isActive && 'examples__list__item__active')}
		>
			{!isActive && (
				<Link to={example.path} aria-labelledby={id} className="examples__list__item__link" />
			)}
			{mainDetails}
			{extraDetails}
		</li>
	)
})
