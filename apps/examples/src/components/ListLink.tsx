import { Link } from 'react-router-dom'

export interface ListLinkProps {
	title: string
	route: string
}

export function ListLink({ title, route }: ListLinkProps) {
	return (
		<li className="examples__list__item">
			<Link to={route}>{title}</Link>
		</li>
	)
}
