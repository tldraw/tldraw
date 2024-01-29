import classNames from 'classnames'
import { ForwardedRef, forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Example } from '../examples'
import { StandaloneIcon } from './Icons'
import { Markdown } from './Markdown'

export const ExamplesLink = forwardRef(function ListLink(
	{
		example,
		isActive,
		showDescriptionWhenInactive,
	}: { example: Example; isActive?: boolean; showDescriptionWhenInactive?: boolean },
	ref: ForwardedRef<HTMLLIElement>
) {
	const mainDetails = (
		<>
			<h3 className="examples__list__item__heading">
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
			{showDescriptionWhenInactive && <Markdown sanitizedHtml={example.description} />}
		</>
	)

	// TODO: re-enable code sandbox links
	// const codeSandboxPath = encodeURIComponent(
	// 	`/src/examples${example.path}${example.componentFile.replace(/^\./, '')}`
	// )
	const extraDetails = (
		<div className="examples__list__item__details" aria-hidden={!isActive}>
			{!showDescriptionWhenInactive && <Markdown sanitizedHtml={example.description} />}
			{example.details && <Markdown sanitizedHtml={example.details} />}
			<div className="examples__list__item__code">
				<a className="link__button" href={example.codeUrl} target="_blank" rel="noreferrer">
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
		<span
			ref={ref}
			className={classNames('examples__list__item', isActive && 'examples__list__item__active')}
		>
			{!isActive && <Link to={example.path} className="examples__list__item__link" />}
			{mainDetails}
			{extraDetails}
		</span>
	)
})
