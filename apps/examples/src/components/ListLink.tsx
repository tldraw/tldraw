import { Link } from 'react-router-dom'

export interface ListLinkProps {
	title: string
	route: string
	description?: string
}

export function ListLink({ title, route, description }: ListLinkProps) {
	return (
		<li className="examples__list__item">
			<h3>{title}</h3>
			<Link className="examples__list__item__button" to={route}>
				Try it out
			</Link>
			<p className="examples__list__item__description">{description}</p>
		</li>
	)
}
