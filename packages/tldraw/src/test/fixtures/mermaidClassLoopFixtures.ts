export interface MermaidClassLoopFixture {
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
 * Fixture set derived from Mermaid class diagram docs:
 * https://mermaid.js.org/syntax/classDiagram.html
 */
export const mermaidClassLoopFixtures: MermaidClassLoopFixture[] = [
	{
		id: 'inheritance-basic',
		title: 'Basic inheritance',
		status: 'supported',
		source: `classDiagram
			Animal <|-- Duck`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['Animal', 'Duck'] },
	},
	{
		id: 'association-labeled',
		title: 'Association with label',
		status: 'supported',
		source: `classDiagram
			Customer --> Order : places`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['Customer', 'Order'] },
	},
	{
		id: 'composition-aggregation',
		title: 'Composition and aggregation',
		status: 'supported',
		source: `classDiagram
			Car *-- Wheel
			Team o-- Player`,
		expected: {
			geo: 4,
			arrow: 2,
			text: 0,
			requiredGeoLabels: ['Car', 'Wheel', 'Team', 'Player'],
		},
	},
	{
		id: 'dependency-dashed',
		title: 'Dependency relationships',
		status: 'supported',
		source: `classDiagram
			Service ..> Repository
			Repository ..> Database`,
		expected: {
			geo: 3,
			arrow: 2,
			text: 0,
			requiredGeoLabels: ['Service', 'Repository', 'Database'],
		},
	},
	{
		id: 'class-block-members',
		title: 'Class block with members',
		status: 'supported',
		source: `classDiagram
			class Person {
				+String name
				+int age
				+greet()
			}`,
		expected: { geo: 1, arrow: 0, text: 0, requiredGeoLabels: ['Person'] },
	},
	{
		id: 'generic-and-annotation',
		title: 'Generic type and annotation',
		status: 'supported',
		source: `classDiagram
			class List~T~
			<<interface>> IStore
			IStore <|.. Store`,
		expected: { geo: 3, arrow: 1, text: 0, requiredGeoLabels: ['List', 'IStore', 'Store'] },
	},
	{
		id: 'cardinality-relationship',
		title: 'Relationship with cardinalities',
		status: 'supported',
		source: `classDiagram
			Customer "1" --> "*" Order : places`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['Customer', 'Order'] },
	},
	{
		id: 'inline-member-lines',
		title: 'Inline member declarations',
		status: 'supported',
		source: `classDiagram
			class Person
			Person : +String name
			Person : +greet()`,
		expected: { geo: 1, arrow: 0, text: 0, requiredGeoLabels: ['Person'] },
	},
	{
		id: 'dashed-link',
		title: 'Dashed link relationship',
		status: 'supported',
		source: `classDiagram
			A .. B`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'multiple-relationship-types',
		title: 'Mixed relationship types',
		status: 'supported',
		source: `classDiagram
			Base <|-- Child
			Child --* Detail
			Child --> Consumer`,
		expected: {
			geo: 4,
			arrow: 3,
			text: 0,
			requiredGeoLabels: ['Base', 'Child', 'Detail', 'Consumer'],
		},
	},
]
