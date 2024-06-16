import classNames from 'classnames'
import { ReactNode } from 'react'
import { Icon } from '../Icon'

export function ParametersTable({ children }: { children: ReactNode }) {
	return (
		<div className="article__parameters-table__wrapper">
			<table className="article__parameters-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>{children}</tbody>
			</table>
		</div>
	)
}

export function ParametersTableRow({ children }: { children: ReactNode }) {
	return <tr className="article__parameters-table__row">{children}</tr>
}

export function ParametersTableName({ children }: { children: ReactNode }) {
	return <td className="article__parameters-table__name">{children}</td>
}

export function ParametersTableDescription({ children }: { children: ReactNode }) {
	return <td className="article__parameters-table__description">{children}</td>
}

export function TitleWithSourceLink({
	children,
	source,
	large,
	tags,
}: {
	children: ReactNode
	source?: string | null
	large?: boolean
	tags?: string[]
}) {
	return (
		<div
			className={classNames(
				'article__title-with-source-link',
				large && 'article__title-with-source-link--large'
			)}
		>
			{children}
			<div className="article__title-with-source-link__meta">
				{tags?.map((tag) => <Tag key={tag}>{tag}</Tag>)}
				{source && (
					<a href={source} target="_blank" rel="noopener noreferrer" title="Source code">
						<Icon icon="code" />
					</a>
				)}
			</div>
		</div>
	)
}

export function Tag({ children }: { children: string }) {
	return <span className={classNames(`article__tag`, `article__tag--${children}`)}>{children}</span>
}
