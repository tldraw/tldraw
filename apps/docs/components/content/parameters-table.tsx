export const ParametersTable: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<div className="prose-p:my-0 prose-pre:hidden prose-code:!bg-zinc-200">
			<table>
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
