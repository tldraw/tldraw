export interface MermaidERLoopFixture {
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
 * Fixture set derived from Mermaid ER docs:
 * https://mermaid.js.org/syntax/entityRelationshipDiagram.html
 */
export const mermaidERLoopFixtures: MermaidERLoopFixture[] = [
	{
		id: 'basic-one-to-many',
		title: 'Basic one-to-many relationship',
		status: 'supported',
		source: `erDiagram
			CUSTOMER ||--o{ ORDER : places`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['CUSTOMER', 'ORDER'] },
	},
	{
		id: 'many-to-many',
		title: 'Many-to-many relationship',
		status: 'supported',
		source: `erDiagram
			STUDENT }o--o{ COURSE : enrolls`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['STUDENT', 'COURSE'] },
	},
	{
		id: 'identifying-and-non-identifying',
		title: 'Identifying and non-identifying links',
		status: 'supported',
		source: `erDiagram
			ORDER ||--|{ LINE_ITEM : contains
			ORDER ||..|| INVOICE : references`,
		expected: {
			geo: 3,
			arrow: 2,
			text: 0,
			requiredGeoLabels: ['ORDER', 'LINE_ITEM', 'INVOICE'],
		},
	},
	{
		id: 'entity-attributes',
		title: 'Entity attribute blocks',
		status: 'supported',
		source: `erDiagram
			USER {
				string id PK
				string email UK
				string teamId FK
			}
			TEAM {
				string id PK
				string name
			}
			USER }o--|| TEAM : belongs_to`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['USER', 'TEAM'] },
	},
	{
		id: 'quoted-relationship-label',
		title: 'Quoted relationship label',
		status: 'supported',
		source: `erDiagram
			FILE ||--o{ VERSION : "has versions"`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['FILE', 'VERSION'] },
	},
	{
		id: 'unlabeled-relationship',
		title: 'Unlabeled relationship line',
		status: 'todo',
		source: `erDiagram
			A ||--o{ B`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
]
