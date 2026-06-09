import { parseFlowchartLayout } from './flowchartDiagram'
import { parseStateDiagramLayout } from './stateDiagram'

function svgFromString(markup: string): SVGSVGElement {
	const container = document.createElement('div')
	container.innerHTML = markup
	return container.querySelector('svg') as unknown as SVGSVGElement
}

// Regression for the mermaid 11.15 upgrade: every rendered element id gained a
// `<svgId>-` prefix, which broke the node/cluster id parsers and produced empty
// diagrams (and therefore failed exports). The parsers must resolve bare ids
// across mermaid versions.
describe('layout parsing tolerates mermaid >= 11.15 prefixed ids', () => {
	it('parses flowchart nodes and clusters', () => {
		const svg = svgFromString(`
			<svg id="mermaid-0">
				<g class="cluster" id="mermaid-0-Frontend" transform="translate(0,0)">
					<rect x="0" y="0" width="200" height="160" />
				</g>
				<g class="node" id="mermaid-0-flowchart-A-0" transform="translate(50,40)">
					<rect width="80" height="40" />
				</g>
			</svg>
		`)
		const layout = parseFlowchartLayout(svg)
		expect([...layout.nodes.keys()]).toEqual(['A'])
		expect([...layout.clusters.keys()]).toEqual(['Frontend'])
	})

	it('parses state nodes and clusters', () => {
		const svg = svgFromString(`
			<svg id="mermaid-1">
				<g class="statediagram-cluster" id="mermaid-1-state-Active-4" transform="translate(0,0)">
					<rect x="0" y="0" width="240" height="180" />
				</g>
				<g class="node" id="mermaid-1-state-Idle-3" transform="translate(30,30)">
					<rect width="60" height="30" />
				</g>
			</svg>
		`)
		const layout = parseStateDiagramLayout(svg)
		expect([...layout.nodes.keys()]).toEqual(['Idle'])
		expect([...layout.clusters.keys()]).toEqual(['Active'])
	})

	it('still parses bare ids from older mermaid versions', () => {
		const svg = svgFromString(`
			<svg>
				<g class="node" id="flowchart-A-0" transform="translate(50,40)">
					<rect width="80" height="40" />
				</g>
			</svg>
		`)
		const layout = parseFlowchartLayout(svg)
		expect([...layout.nodes.keys()]).toEqual(['A'])
	})
})
