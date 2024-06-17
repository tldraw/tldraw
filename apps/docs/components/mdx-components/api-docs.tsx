import classNames from 'classnames'
import Link from 'next/link'
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
	inherited,
}: {
	children: ReactNode
	source?: string | null
	large?: boolean
	tags?: string[]
	inherited?: { name: string; link: string }
}) {
	return (
		<>
			<div
				className={classNames(
					'article__title-with-source-link',
					large && 'article__title-with-source-link--large'
				)}
			>
				{children}
				<div className="article__title-with-source-link__meta">
					{tags?.map((tag) => (
						<Tag key={tag} tag={tag}>
							{tag}
						</Tag>
					))}
					{source && (
						<a
							href={source}
							target="_blank"
							rel="noopener noreferrer"
							title="Source code"
							className="article__title-with-source-link__source"
						>
							<Icon icon="code" />
						</a>
					)}
				</div>
			</div>
			{inherited && (
				<div className="article__title-with-source-link__from">
					from{' '}
					<code className="hljs">
						<Link href={inherited.link} className="code-link">
							{inherited.name}
						</Link>
					</code>
				</div>
			)}
		</>
	)
}

export function Tag({ children, tag }: { children: ReactNode; tag: string }) {
	return <span className={classNames(`article__tag`, `article__tag--${tag}`)}>{children}</span>
}
