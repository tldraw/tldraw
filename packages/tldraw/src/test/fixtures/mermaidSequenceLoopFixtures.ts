export interface MermaidSequenceLoopFixture {
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
 * Fixture set derived from Mermaid sequence docs:
 * https://mermaid.js.org/syntax/sequenceDiagram.html
 */
export const mermaidSequenceLoopFixtures: MermaidSequenceLoopFixture[] = [
	{
		id: 'basic-message',
		title: 'Basic message between participants',
		status: 'supported',
		source: `sequenceDiagram
			Alice->>Bob: Hello Bob`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['Alice', 'Bob'] },
	},
	{
		id: 'actor-aliases',
		title: 'Actor and participant aliases',
		status: 'supported',
		source: `sequenceDiagram
			actor A as Alice
			participant B as Bob
			A->B: Hi`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['Alice', 'Bob'] },
	},
	{
		id: 'autonumber-messages',
		title: 'Autonumber with multiple messages',
		status: 'supported',
		source: `sequenceDiagram
			autonumber
			A->>B: First
			B-->>A: Second`,
		expected: { geo: 2, arrow: 2, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'activation-directives',
		title: 'activate/deactivate directives',
		status: 'supported',
		source: `sequenceDiagram
			A->>B: Ping
			activate B
			B-->>A: Pong
			deactivate B`,
		expected: { geo: 2, arrow: 4, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'inline-activation-markers',
		title: 'Inline + / - activation markers',
		status: 'supported',
		source: `sequenceDiagram
			A->>+B: Start
			B-->>-A: End`,
		expected: { geo: 2, arrow: 4, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'create-and-destroy',
		title: 'create and destroy participant directives',
		status: 'supported',
		source: `sequenceDiagram
			participant A
			create participant B
			A->>B: Spawn
			destroy B
			A->>B: Done`,
		expected: { geo: 2, arrow: 2, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'loop-block',
		title: 'loop block',
		status: 'supported',
		source: `sequenceDiagram
			A->>B: Init
			loop Retry until success
				A->>B: Retry
			end
			B-->>A: Ack`,
		expected: { geo: 2, arrow: 3, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'alt-else-block',
		title: 'alt / else block',
		status: 'supported',
		source: `sequenceDiagram
			A->>B: Request
			alt Success
				B-->>A: OK
			else Failure
				B-->>A: Error
			end`,
		expected: { geo: 2, arrow: 3, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'par-and-block',
		title: 'par / and block',
		status: 'supported',
		source: `sequenceDiagram
			par Branch one
				A->>B: First
			and Branch two
				B->>A: Second
			end`,
		expected: { geo: 2, arrow: 2, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'critical-option-block',
		title: 'critical / option block',
		status: 'supported',
		source: `sequenceDiagram
			critical Must complete
				A->>B: Work
			option Rollback
				B->>A: Undo
			end`,
		expected: { geo: 2, arrow: 2, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'rect-block',
		title: 'rect block',
		status: 'supported',
		source: `sequenceDiagram
			rect rgba(0, 0, 255, .1)
				A->>B: In block
			end`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
]
