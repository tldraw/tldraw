import { parseFlowchartLayout } from './flowchartDiagram'
import { parseStateDiagramLayout } from './stateDiagram'

function svgFromString(markup: string): SVGSVGElement {
	const container = document.createElement('div')
	container.innerHTML = markup
	return container.querySelector('svg') as unknown as SVGSVGElement
}

function nodeMarkup(domId: string) {
	return `<g class="node" id="${domId}" transform="translate(50,40)"><rect width="80" height="40" /></g>`
}

function edgeMarkup(dataId: string, points: [number, number][]) {
	const data = btoa(JSON.stringify(points.map(([x, y]) => ({ x, y }))))
	return `<path data-id="${dataId}" id="mermaid-0-${dataId}" data-points="${data}" />`
}

// Regression for the mermaid 11.15 upgrade: every rendered element id gained a
// `<svgId>-` prefix, which broke the node/cluster id parsers and produced empty
// diagrams (and therefore failed exports). The parsers must resolve bare ids
// across mermaid versions.
describe('layout parsing tolerates mermaid >= 11.15 prefixed ids', () => {
	it('parses flowchart nodes, clusters, and edges', () => {
		const svg = svgFromString(`
			<svg id="mermaid-0">
				<g class="cluster" id="mermaid-0-Frontend" transform="translate(0,0)">
					<rect x="0" y="0" width="200" height="160" />
				</g>
				${nodeMarkup('mermaid-0-flowchart-A-0')}
				${nodeMarkup('mermaid-0-flowchart-B-1')}
				${edgeMarkup('L_A_B_0', [
					[0, 0],
					[100, 0],
				])}
			</svg>
		`)
		const layout = parseFlowchartLayout(svg)
		expect([...layout.nodes.keys()]).toEqual(['A', 'B'])
		expect([...layout.clusters.keys()]).toEqual(['Frontend'])
		expect(layout.edges.map((e) => [e.start, e.end])).toEqual([['A', 'B']])
	})

	it('parses state nodes, clusters, and edges', () => {
		const svg = svgFromString(`
			<svg id="mermaid-1">
				<g class="statediagram-cluster" id="mermaid-1-state-Active-4" transform="translate(0,0)">
					<rect x="0" y="0" width="240" height="180" />
				</g>
				${nodeMarkup('mermaid-1-state-Idle-3')}
				${nodeMarkup('mermaid-1-state-Moving-5')}
				${edgeMarkup('edge0', [
					[0, 0],
					[100, 0],
				])}
			</svg>
		`)
		const layout = parseStateDiagramLayout(svg)
		expect([...layout.nodes.keys()]).toEqual(['Idle', 'Moving'])
		expect([...layout.clusters.keys()]).toEqual(['Active'])
		expect(layout.edges).toHaveLength(1)
	})

	it('still parses bare ids from older mermaid versions', () => {
		const svg = svgFromString(`
			<svg>
				${nodeMarkup('flowchart-A-0')}
				${edgeMarkup('L_A_B_0', [
					[0, 0],
					[100, 0],
				])}
			</svg>
		`)
		const layout = parseFlowchartLayout(svg)
		expect([...layout.nodes.keys()]).toEqual(['A'])
		expect(layout.edges.map((e) => [e.start, e.end])).toEqual([['A', 'B']])
	})
})
