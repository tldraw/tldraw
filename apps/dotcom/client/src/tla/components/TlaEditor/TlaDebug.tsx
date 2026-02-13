/* eslint-disable react/jsx-no-literals */
import { memo } from 'react'
import { ExampleDialog, TldrawUiMenuItem, useDialogs } from 'tldraw'

export function A11yAudit() {
	const { addDialog } = useDialogs()

	const runA11yAudit = async () => {
		const axe = (await import('axe-core')).default
		axe.run(document, {}, (err, results) => {
			if (err) throw err

			// eslint-disable-next-line no-console
			console.debug('[a11y]:', results)

			addDialog({
				component: ({ onClose }) => (
					<ExampleDialog
						body={<A11yResultTable results={results} />}
						title="Accessibility Audit Results"
						maxWidth="80vw"
						cancel="Close"
						confirm="Ok"
						onCancel={() => onClose()}
						onContinue={() => onClose()}
					/>
				),
				onClose: () => {
					void null
				},
			})
		})
	}

	return <TldrawUiMenuItem id="a11y-audit" onSelect={runA11yAudit} label={'A11y audit'} />
}

export const A11yResultTable = memo(({ results }: { results: any }) => {
	const { violations, incomplete } = results
	const allIssues = [
		...violations.map((v: any) => ({ ...v, type: 'violation' })),
		...incomplete.map((i: any) => ({ ...i, type: 'incomplete' })),
	]

	return (
		<div style={{ overflow: 'auto' }}>
			<table className="tlui-a11y-audit">
				<thead>
					<tr>
						<th>Type</th>
						<th>Impact</th>
						<th>Description</th>
						<th>Elements</th>
						<th>Help</th>
					</tr>
				</thead>
				<tbody>
					{!allIssues.length && (
						<tr>
							<td colSpan={5}>No accessibility issues found</td>
						</tr>
					)}
					{allIssues.map((issue: any, index: number) => (
						<tr
							key={index}
							style={{ backgroundColor: issue.type === 'violation' ? '#fff0f0' : '#fffde7' }}
						>
							<td>{issue.type === 'violation' ? '⚠️ Violation' : '⚙️ Incomplete'}</td>
							<td>{issue.impact || 'unknown'}</td>
							<td>{issue.help || issue.description}</td>
							<td>
								{issue.nodes.map((node: any, index: number) => (
									<div key={index}>{node.target}</div>
								))}
							</td>
							<td>
								{issue.helpUrl ? (
									<a href={issue.helpUrl} target="_blank" rel="noopener noreferrer">
										More info
									</a>
								) : null}
							</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr>
						<td colSpan={5}>
							Total issues: {allIssues.length} (Violations: {violations.length}, Incomplete:{' '}
							{incomplete.length})
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	)
})
