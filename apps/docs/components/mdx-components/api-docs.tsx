import { ReactNode } from 'react'

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
