/**
 * This example only runs Mermaid `flowchart` / `graph` diagrams.
 * Returns a user-facing error string, or null if the first real line looks valid.
 */
export function getFlowchartSourceError(source: string): string | null {
	const lines = source.split(/\r?\n/)
	for (const line of lines) {
		const t = line.trim()
		if (t === '') continue
		if (t.startsWith('%%')) continue
		if (/^(flowchart|graph)\b/i.test(t)) {
			return null
		}
		return 'Use a flowchart or graph diagram only (first line should start with flowchart or graph).'
	}
	return 'Diagram source is empty.'
}
