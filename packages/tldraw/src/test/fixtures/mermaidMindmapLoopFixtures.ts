export interface MermaidMindmapLoopFixture {
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
 * Fixture set derived from Mermaid mindmap docs:
 * https://mermaid.js.org/syntax/mindmap.html
 */
export const mermaidMindmapLoopFixtures: MermaidMindmapLoopFixture[] = [
	{
		id: 'basic-tree',
		title: 'Basic root with two children',
		status: 'supported',
		source: `mindmap
			Root
				ChildA
				ChildB`,
		expected: {
			geo: 3,
			arrow: 2,
			text: 0,
			requiredGeoLabels: ['Root', 'ChildA', 'ChildB'],
		},
	},
	{
		id: 'deeper-branching',
		title: 'Deeper branching hierarchy',
		status: 'supported',
		source: `mindmap
			Project
				Design
					UI
					UX
				Build
					Frontend
					Backend`,
		expected: {
			geo: 7,
			arrow: 6,
			text: 0,
			requiredGeoLabels: ['Project', 'Design', 'UI', 'UX', 'Build', 'Frontend', 'Backend'],
		},
	},
	{
		id: 'shape-variants',
		title: 'Node shape variants',
		status: 'supported',
		source: `mindmap
			Root
				((Circle))
				[Rect]
				(Rounded)
				{{Hex}}`,
		expected: {
			geo: 5,
			arrow: 4,
			text: 0,
			requiredGeoLabels: ['Root', 'Circle', 'Rect', 'Rounded', 'Hex'],
		},
	},
	{
		id: 'icons',
		title: 'Node icons',
		status: 'supported',
		source: `mindmap
			Root
				Build::icon(fa fa-wrench)
				Test::icon(fa fa-vial)`,
		expected: { geo: 3, arrow: 2, text: 0, requiredGeoLabels: ['Root', 'Build', 'Test'] },
	},
	{
		id: 'mixed-depth',
		title: 'Mixed sibling and nested depth',
		status: 'supported',
		source: `mindmap
			Main
				A
					A1
				B
				C
					C1
					C2`,
		expected: {
			geo: 7,
			arrow: 6,
			text: 0,
			requiredGeoLabels: ['Main', 'A', 'A1', 'B', 'C', 'C1', 'C2'],
		},
	},
]
