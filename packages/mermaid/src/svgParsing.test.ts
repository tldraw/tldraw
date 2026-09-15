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

describe('edge label parsing', () => {
	// Mermaid's markup: the label group is translated to its box's top-left corner, inside an
	// `edgeLabel` group translated to the label's centre. Edges without text get an empty group.
	function labelMarkup(dataId: string, center: [number, number], size: [number, number]) {
		const [w, h] = size
		return `<g class="edgeLabel" transform="translate(${center[0]}, ${center[1]})">
			<g class="label" data-id="${dataId}" transform="translate(${-w / 2}, ${-h / 2})">
				<foreignObject width="${w}" height="${h}"></foreignObject>
			</g>
		</g>`
	}

	it("keys each label's box by the data-id it shares with its path", () => {
		const svg = svgFromString(`
			<svg id="mermaid-0">
				<g class="edgeLabels" transform="translate(10, 20)">
					${labelMarkup('L_B_B_0', [100, 200], [80, 40])}
					<g class="edgeLabel"><g class="label" data-id="L_A_B_0" transform="translate(0, 0)">
						<foreignObject width="0" height="0"></foreignObject>
					</g></g>
				</g>
				${nodeMarkup('mermaid-0-flowchart-B-0')}
				${edgeMarkup('L_B_B_0', [
					[40, 60],
					[70, 60],
				])}
			</svg>
		`)
		const layout = parseFlowchartLayout(svg)

		expect(layout.edges[0].id).toBe('L_B_B_0')
		// Scaled with the rest of the layout, so the box stays put relative to its loop.
		const scale = layout.edges[0].points[0].x / 40
		expect(layout.edgeLabels).toEqual(
			new Map([['L_B_B_0', { x: 70 * scale, y: 200 * scale, w: 80 * scale, h: 40 * scale }]])
		)
	})
})
