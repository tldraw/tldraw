export interface MermaidBlockLoopFixture {
	id: string
	title: string
	status: 'supported' | 'todo'
	source: string
	expected: {
		geo: number
		arrow: number
		text: number
		requiredGeoLabels?: string[]
		forbiddenGeoLabels?: string[]
	}
}

/**
 * Fixture set derived from Mermaid block diagram docs:
 * https://mermaid.js.org/syntax/block.html
 */
export const mermaidBlockLoopFixtures: MermaidBlockLoopFixture[] = [
	{
		id: 'basic-block',
		title: 'Basic block diagram',
		status: 'supported',
		source: `block-beta
			A --> B`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'columns',
		title: 'Columns declaration',
		status: 'supported',
		source: `block-beta
			columns 2
			A --> B`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'shape-gallery',
		title: 'Shape variants',
		status: 'supported',
		source: `block-beta
			a((Start))
			b{Decision}
			c[[Step]]
			d[Result]`,
		expected: { geo: 4, arrow: 0, text: 0, requiredGeoLabels: ['Start', 'Decision', 'Step', 'Result'] },
	},
	{
		id: 'span-syntax',
		title: 'Node span syntax',
		status: 'supported',
		source: `block-beta
			A:2
			B:1
			A --> B`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'nested-block',
		title: 'Nested block with explicit id',
		status: 'supported',
		source: `block-beta
			block:Group
				A
				B
			end
			A --> B`,
		expected: { geo: 3, arrow: 1, text: 0, requiredGeoLabels: ['Group', 'A', 'B'] },
	},
	{
		id: 'mixed-edge-operators',
		title: 'Multiple edge operators',
		status: 'supported',
		source: `block-beta
			A --- B
			B ==> C
			C -.-> D`,
		expected: { geo: 4, arrow: 3, text: 0, requiredGeoLabels: ['A', 'B', 'C', 'D'] },
	},
]
