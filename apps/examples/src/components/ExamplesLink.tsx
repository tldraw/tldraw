import classNames from 'classnames'
import { ForwardedRef, forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Example } from '../examples'

export const ExamplesLink = forwardRef(function ListLink(
	{
		example,
		isActive,
	}: { example: Example; isActive?: boolean; showDescriptionWhenInactive?: boolean },
	ref: ForwardedRef<HTMLLIElement>
) {
	return (
		<span
			ref={ref}
			className={classNames('examples__list__item', isActive && 'examples__list__item__active')}
		>
			{!isActive && <Link to={example.path} className="examples__list__item__link" />}
		</span>
	)
})
