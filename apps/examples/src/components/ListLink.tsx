import classNames from 'classnames'
import { ForwardedRef, forwardRef, useId } from 'react'
import { Link } from 'react-router-dom'
import { Example } from '../examples'
import { Markdown } from './Markdown'
import { StandaloneIcon } from './StandaloneIcon'

export const ListLink = forwardRef(function ListLink(
	{
		example,
		isActive,
		showDescriptionWhenInactive,
	}: { example: Example; isActive?: boolean; showDescriptionWhenInactive?: boolean },
	ref: ForwardedRef<HTMLLIElement>
) {
	const id = useId()

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
			{showDescriptionWhenInactive && <Markdown sanitizedHtml={example.description} />}
		</>
	)

	const extraDetails = (
		<div className="examples__list__item__details" aria-hidden={!isActive}>
			{!showDescriptionWhenInactive && <Markdown sanitizedHtml={example.description} />}
			<Markdown sanitizedHtml={example.details} />
			<div className="examples__list__item__code">
				<a href={example.codeUrl} target="_blank" rel="noreferrer">
					View code
					{/* <ExternalLinkIcon /> */}
				</a>
			</div>
		</div>
	)

	return (
		<li
			ref={ref}
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
