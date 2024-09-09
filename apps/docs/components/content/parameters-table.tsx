export function ParametersTable({ children }: { children: React.ReactNode }) {
	return (
		<div className="prose-p:my-0 prose-pre:hidden prose-code:!bg-zinc-200 dark:prose-code:!bg-zinc-800">
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
