import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
import { parseFlowchartLayout } from './flowchartDiagram'
import { countSequenceEvents, LINETYPE, parseSequenceLayout } from './sequenceDiagram'
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

describe('sequence row parsing', () => {
	function participantsMarkup(footerY: number) {
		return [0, 200]
			.map(
				(x) => `<rect class="actor actor-top" x="${x}" y="0" width="150" height="65" />
				<rect class="actor actor-bottom" x="${x}" y="${footerY}" width="150" height="65" />`
			)
			.join('')
	}

	it('reads where mermaid drew each row and fragment frame, keyed by message index', () => {
		const svg = svgFromString(`
			<svg>
				${participantsMarkup(500)}
				<g data-et="note" data-id="i1"><rect class="note" x="80" y="121" width="100" height="135" /></g>
				<g data-et="control-structure" data-id="i6">
					<line class="loopLine" x1="0" y1="280" x2="350" y2="280" />
					<line class="loopLine" x1="350" y1="280" x2="350" y2="470" />
					<line class="loopLine" x1="0" y1="470" x2="350" y2="470" />
					<line class="loopLine" x1="0" y1="280" x2="0" y2="470" />
					<line class="loopLine" x1="0" y1="380" x2="350" y2="380" />
				</g>
				<text class="messageText" y="80">hello</text>
				<line data-et="message" data-id="i0" x1="75" y1="111" x2="275" y2="111" />
				<path data-et="message" data-id="i2" d="M 275,239 C 335,229 335,269 275,259" />
			</svg>
		`)

		const { rowYs, fragmentFrames } = parseSequenceLayout(svg, 2, 3)

		// The diagram is centred on the origin: 565px tall, so mermaid's y = 0 lands at -282.5.
		const toLayoutY = (svgY: number) => svgY - 282.5
		expect(rowYs).toEqual(
			new Map([
				// A quarter of the way up from the line to the top of its label.
				[0, toLayoutY(111 - (111 - 80) / 4)],
				[1, toLayoutY(121 + 135 / 2)],
				// Centred on the 20px loop.
				[2, toLayoutY(249)],
			])
		)
		expect(fragmentFrames).toEqual(
			new Map([[6, { top: toLayoutY(280), bottom: toLayoutY(470), sectionYs: [toLayoutY(380)] }]])
		)
	})

	it("spreads a short diagram's stretch over the rows between header and footer", () => {
		const svg = svgFromString(`
			<svg>
				${participantsMarkup(300)}
				<line data-et="message" data-id="i0" x1="75" y1="182.5" x2="275" y2="182.5" />
			</svg>
		`)

		const { actorLayouts, rowYs } = parseSequenceLayout(svg, 2, 1)

		// Halfway between the header and the footer before stretching, and after it too.
		const headerBottom = actorLayouts[0].y + 65
		expect(rowYs.get(0)).toBeCloseTo((headerBottom + actorLayouts[0].bottomY) / 2)
	})

	it('measures the diagram past a created or destroyed participant', () => {
		// mermaid draws a destroyed participant's bottom box on its destruction row and a created
		// participant's top box on its creation row, both mid-diagram. Measuring the header-to-footer
		// gap from one of those reports a far shorter diagram than mermaid drew, and the stretch that
		// compensates then leaves every surviving lifeline too long.
		function layoutFor(topYs: number[], bottomYs: number[]) {
			const actors = topYs
				.map(
					(topY, i) =>
						`<rect class="actor actor-top" x="${i * 200}" y="${topY}" width="150" height="65" />
						<rect class="actor actor-bottom" x="${i * 200}" y="${bottomYs[i]}" width="150" height="65" />`
				)
				.join('')
			const svg = svgFromString(`
				<svg>
					${actors}
					<line data-et="message" data-id="i0" x1="75" y1="182.5" x2="275" y2="182.5" />
				</svg>
			`)
			return parseSequenceLayout(svg, 3, 1)
		}
		function lifelineLengths(topYs: number[], bottomYs: number[]) {
			return layoutFor(topYs, bottomYs).actorLayouts.map((l) => l.bottomY - (l.y + l.h))
		}

		// 500 - 65 clears MIN_VERTICAL_GAP, so nothing is stretched and each lifeline runs the
		// diagram's full height less the header box and its padding.
		const full = 500 - 65 - 10
		expect(lifelineLengths([0, 0, 0], [500, 500, 500])).toEqual([full, full, full])

		// A participant destroyed on row 150 keeps its own short lifeline; the others are untouched.
		expect(lifelineLengths([0, 0, 0], [500, 150, 500])).toEqual([full, 150 - 65 - 10, full])

		// A participant created on row 150 starts late, and again the others are untouched.
		expect(lifelineLengths([0, 150, 0], [500, 500, 500])).toEqual([full, 500 - 150 - 65 - 10, full])

		// 300 - 65 falls short of MIN_VERTICAL_GAP, so this one is stretched. The mid-diagram boxes
		// take the same share of that stretch as the row they sit on, which is the message at 182.5.
		const destroyed = layoutFor([0, 0, 0], [300, 182.5, 300])
		expect(destroyed.actorLayouts[1].bottomY).toBeCloseTo(destroyed.rowYs.get(0)!)
		const created = layoutFor([0, 182.5, 0], [300, 300, 300])
		expect(created.actorLayouts[1].y).toBeCloseTo(created.rowYs.get(0)!)
	})

	it("reads every row and frame from the installed mermaid's own rendering", async () => {
		// The markup above is built by hand to match mermaid's. If a mermaid upgrade changes it, those
		// tests stay green while rows stop being read and every diagram falls back to even spacing.
		const svgPrototype = SVGElement.prototype as any
		// jsdom lays out no text; mermaid only needs some size for it to render.
		svgPrototype.getBBox = function () {
			return { x: 0, y: 0, width: (this.textContent ?? '').length * 8, height: 16 }
		}
		svgPrototype.getComputedTextLength = function () {
			return (this.textContent ?? '').length * 8
		}
		try {
			const mermaid = (await import('mermaid')).default
			mermaid.initialize({ startOnLoad: false })
			const source = `sequenceDiagram
    participant A
    participant B
    A->>B: Hello
    loop Every minute
        B->>B: Tick
        alt Healthy
            B-->>A: Fine
        else Failing
            Note over A,B: Retry<br/>with backoff
            A->>B: Again
        end
    end
    B-->>A: Done`
			const { svg } = await mermaid.render('sequence-rows', source)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const db = (await mermaid.mermaidAPI.getDiagramFromText(source)).db as SequenceDB
			const messages = db.getMessages()

			const { rowYs, fragmentFrames } = parseSequenceLayout(
				svgFromString(svg),
				db.getActorKeys().length,
				countSequenceEvents(messages)
			)

			// Messages, the self-message and the note all get a row: a single missing one sends the
			// whole diagram back to even spacing.
			const rowTypes: number[] = [LINETYPE.SOLID, LINETYPE.DOTTED, LINETYPE.NOTE]
			const eventIndices = messages.flatMap((m, i) => (rowTypes.includes(m.type!) ? [i] : []))
			expect([...rowYs.keys()].sort((a, b) => a - b)).toEqual(eventIndices)
			const ys = eventIndices.map((i) => rowYs.get(i)!)
			expect(ys.every((y, i) => i === 0 || y > ys[i - 1])).toBe(true)

			const loop = fragmentFrames.get(messages.findIndex((m) => m.type === LINETYPE.LOOP_END))!
			const alt = fragmentFrames.get(messages.findIndex((m) => m.type === LINETYPE.ALT_END))!
			expect(fragmentFrames.size).toBe(2)
			expect(loop.sectionYs).toEqual([])
			expect(alt.sectionYs).toHaveLength(1)
			expect(alt.top).toBeGreaterThan(loop.top)
			expect(alt.bottom).toBeLessThan(loop.bottom)
		} finally {
			delete svgPrototype.getBBox
			delete svgPrototype.getComputedTextLength
		}
	})
})
