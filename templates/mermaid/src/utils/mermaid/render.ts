import mermaid from 'mermaid'

let initialized = false

function ensureInitialized() {
	if (initialized) return
	mermaid.initialize({
		startOnLoad: false,
		theme: 'default',
		securityLevel: 'loose',
		flowchart: { htmlLabels: true, curve: 'linear' },
	})
	initialized = true
}

export async function renderMermaidSvgString(code: string): Promise<string> {
	ensureInitialized()
	const id = `mermaid-layout-${Date.now()}`
	const { svg } = await mermaid.render(id, code)
	return svg
}
