import { ReactNode } from 'react'

export function ParametersTable({ children }: { children: ReactNode }) {
	return (
		<table className="parametersTable">
			<thead>
				<tr>
					<th>Name</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>{children}</tbody>
		</table>
	)
}

export function ParametersTableRow({ children }: { children: ReactNode }) {
	return <tr className="parametersTable-row">{children}</tr>
}

export function ParametersTableName({ children }: { children: ReactNode }) {
	return <td className="parametersTable-name">{children}</td>
}

export function ParametersTableDescription({ children }: { children: ReactNode }) {
	return <td className="parametersTable-description">{children}</td>
}
