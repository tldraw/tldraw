import mermaid from 'mermaid'
import type { FlowDB } from 'mermaid/dist/diagrams/flowchart/flowDb.d.ts'
import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
import type { StateDB } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import type { DiagramMermaidBlueprint } from './blueprint'
import { flowchartToBlueprint } from './flowchartDiagram'
import { sequenceToBlueprint } from './sequenceDiagram'
import { stateToBlueprint } from './stateDiagram'

let renderId = 0

const FONT_INFLATE = 1.4
mermaid.initialize({
	startOnLoad: false,
	flowchart: { nodeSpacing: 80, rankSpacing: 80, padding: 20 },
	state: { nodeSpacing: 80, rankSpacing: 80, padding: 20 },
	sequence: { actorMargin: 50, noteMargin: 20 },
	themeVariables: { fontSize: `${18 * FONT_INFLATE}px` },
})

async function prepareDiagram(text: string) {
	const offscreen = document.createElement('div')
	offscreen.style.position = 'absolute'
	offscreen.style.left = '-9999px'
	document.body.appendChild(offscreen)

	const { svg } = await mermaid.render(`mermaid-test-${renderId++}`, text, offscreen)

	let liveSvg = offscreen.querySelector('svg')
	if (!liveSvg) {
		offscreen.innerHTML = svg
		liveSvg = offscreen.querySelector('svg')
		if (!liveSvg) throw new Error('mermaid.render() produced no SVG element')
	}

	// eslint-disable-next-line @typescript-eslint/no-deprecated
	const diagramResult = await mermaid.mermaidAPI.getDiagramFromText(text)

	return { liveSvg, db: diagramResult.db, cleanup: () => offscreen.remove() }
}

function round2(value: number): number {
	return Math.round(value * 100) / 100
}

function normalizeBlueprint(blueprint: DiagramMermaidBlueprint): DiagramMermaidBlueprint {
	return {
		nodes: blueprint.nodes.map((node) => ({
			...node,
			x: Math.round(node.x),
			y: Math.round(node.y),
			w: Math.round(node.w),
			h: Math.round(node.h),
		})),
		edges: blueprint.edges.map((edge) => ({
			...edge,
			bend: Math.round(edge.bend),
			...(edge.anchorStartY !== undefined && { anchorStartY: round2(edge.anchorStartY) }),
			...(edge.anchorEndY !== undefined && { anchorEndY: round2(edge.anchorEndY) }),
		})),
		...(blueprint.lines && {
			lines: blueprint.lines.map((line) => ({
				...line,
				x: Math.round(line.x),
				y: Math.round(line.y),
				endY: Math.round(line.endY),
			})),
		}),
		...(blueprint.groups && { groups: blueprint.groups }),
	}
}

async function flowchartBlueprint(text: string): Promise<DiagramMermaidBlueprint> {
	const { liveSvg, db, cleanup } = await prepareDiagram(text)
	try {
		const flowDb = db as FlowDB
		return flowchartToBlueprint(
			liveSvg,
			flowDb.getVertices() as Map<string, FlowVertex>,
			flowDb.getEdges() as FlowEdge[],
			flowDb.getSubGraphs() as FlowSubGraph[]
		)
	} finally {
		cleanup()
	}
}

async function sequenceBlueprint(text: string): Promise<DiagramMermaidBlueprint> {
	const { liveSvg, db, cleanup } = await prepareDiagram(text)
	try {
		const sequenceDb = db as SequenceDB
		return sequenceToBlueprint(
			liveSvg,
			sequenceDb.getActors(),
			sequenceDb.getActorKeys(),
			sequenceDb.getMessages(),
			sequenceDb.getCreatedActors(),
			sequenceDb.getDestroyedActors()
		)
	} finally {
		cleanup()
	}
}

async function stateBlueprint(text: string): Promise<DiagramMermaidBlueprint> {
	const { liveSvg, db, cleanup } = await prepareDiagram(text)
	try {
		const stateDb = db as StateDB
		return stateToBlueprint(liveSvg, stateDb.getStates(), stateDb.getRelations())
	} finally {
		cleanup()
	}
}

describe('blueprint tests', () => {
	describe('flowchart', () => {
		it('simple TD flowchart', async () => {
			const blueprint = await flowchartBlueprint(`flowchart TD
  A[Start] --> B{Is it?}
  B -->|Yes| C[OK]
  B ---->|No| E[End]`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('LR flowchart', async () => {
			const blueprint = await flowchartBlueprint(`flowchart LR
  Start --> Stop`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('flowchart with subgraphs', async () => {
			const blueprint = await flowchartBlueprint(`flowchart TB
  c1-->a2
  subgraph one
    a1-->a2
  end
  subgraph two
    b1-->b2
  end
  subgraph three
    c1-->c2
  end`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('LR flowchart with parallel edges and self-loop', async () => {
			const blueprint = await flowchartBlueprint(`flowchart LR
  A[Client] -->|Request| B[Server]
  B -->|Response| A
  B --> C{Decision}
  C -->|Yes| D[Process]
  C -->|No| E[Reject]
  D --> D
  D --> F[Done]`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('TB flowchart with parallel edges and self-loop', async () => {
			const blueprint = await flowchartBlueprint(`flowchart TB
  A[Client] -->|Request| B[Server]
  B -->|Response| A
  B --> C{Decision}
  C -->|Yes| D[Process]
  C -->|No| E[Reject]
  D --> D
  D --> F[Done]`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('flowchart with classDef fills', async () => {
			const blueprint = await flowchartBlueprint(`flowchart TD
  A[Start] --> B[End]
  classDef green fill:#00ff00
  classDef blue fill:#0000ff
  class A green
  class B blue`)
			const startNode = blueprint.nodes.find((node) => node.label === 'Start')
			if (startNode?.fill) {
				expect(startNode.fill).toBe('solid')
				expect(startNode.color).toBe('light-green')
			}
			const endNode = blueprint.nodes.find((node) => node.label === 'End')
			if (endNode?.fill) {
				expect(endNode.fill).toBe('solid')
				expect(endNode.color).toBe('blue')
			}
		})

		it('flowchart with classDef fill+stroke blending', async () => {
			const blueprint = await flowchartBlueprint(`flowchart TD
  A[API Gateway] --> B[Auth Service]
  B --> C[(Users DB)]
  classDef svc fill:#e3f2fd,stroke:#1565c0;
  classDef db fill:#f3e5f5,stroke:#6a1b9a;
  class A,B svc;
  class C db;`)
			const svcNode = blueprint.nodes.find((node) => node.label === 'Auth Service')
			expect(svcNode?.fill).toBe('solid')
			expect(svcNode?.color).toBe('light-blue')
			const dbNode = blueprint.nodes.find((node) => node.label === 'Users DB')
			expect(dbNode?.fill).toBe('solid')
			expect(dbNode?.color).toBe('violet')
		})

		it('flowchart with inline style directives', async () => {
			const blueprint = await flowchartBlueprint(`flowchart TD
  A[Request] --> B[Validation]
  B --> C[Success]
  B --> D[Failure]
  style B fill:#fff4cc,stroke:#cc9900,stroke-width:2px
  style C fill:#e8f5e9,stroke:#2e7d32
  style D fill:#ffebee,stroke:#c62828`)
			const validation = blueprint.nodes.find((node) => node.label === 'Validation')
			expect(validation?.fill).toBe('solid')
			expect(validation?.color).toBe('yellow')
			const success = blueprint.nodes.find((node) => node.label === 'Success')
			expect(success?.fill).toBe('solid')
			expect(success?.color).toBe('light-green')
			const failure = blueprint.nodes.find((node) => node.label === 'Failure')
			expect(failure?.fill).toBe('solid')
			expect(failure?.color).toBe('light-red')
			const request = blueprint.nodes.find((node) => node.label === 'Request')
			expect(request?.fill).toBeUndefined()
		})

		it('flowchart with linkStyle color and dash', async () => {
			const blueprint = await flowchartBlueprint(`flowchart LR
  A[Client] -->|GET| B[API]
  A -->|POST| B
  B -->|200| A
  B -->|400| A
  linkStyle 0 stroke:#2a7,stroke-width:2px
  linkStyle 1 stroke:#27a,stroke-width:2px,stroke-dasharray: 4 3`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})
	})

	describe('state diagram', () => {
		it('simple state diagram', async () => {
			const blueprint = await stateBlueprint(`stateDiagram-v2
  [*] --> Still
  Still --> Moving
  Moving --> Still
  Moving --> Crash
  Crash --> [*]`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('state diagram with classDef fills', async () => {
			const blueprint = await stateBlueprint(`stateDiagram-v2
  [*] --> Idle
  Idle --> Active : start
  Active --> [*]
  classDef green fill:#00ff00
  classDef red fill:#ff0000
  class Idle green
  class Active red`)
			const idleNode = blueprint.nodes.find((node) => node.label === 'Idle')
			if (idleNode?.fill) {
				expect(idleNode.fill).toBe('solid')
				expect(idleNode.color).toBe('light-green')
			}
			const activeNode = blueprint.nodes.find((node) => node.label === 'Active')
			if (activeNode?.fill) {
				expect(activeNode.fill).toBe('solid')
				expect(activeNode.color).toBe('red')
			}
		})

		it('compound state with bidirectional edges and self-loop', async () => {
			const blueprint = await stateBlueprint(`stateDiagram-v2
  [*] --> Session
  state Session {
    [*] --> Unauthed
    Unauthed --> Authed: login
    Authed --> Unauthed: logout
    Authed --> Authed: refresh
  }
  Session --> [*]: close`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('compound state diagram', async () => {
			const blueprint = await stateBlueprint(`stateDiagram-v2
  [*] --> First
  [*] --> Second
  state First {
    [*] --> fA
    fA --> [*]
  }
  state Second {
    [*] --> sA
    sA --> [*]
  }`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('state diagram with notes', async () => {
			const blueprint = await stateBlueprint(`stateDiagram-v2
  [*] --> TicketOpen
  TicketOpen --> Investigating: assign
  Investigating --> WaitingForCustomer: need info
  WaitingForCustomer --> Investigating: reply received
  Investigating --> Resolved: fix applied
  Resolved --> Closed: confirm
  note right of WaitingForCustomer
    SLA clock may pause here
  end note`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()

			const noteNode = blueprint.nodes.find((n) => n.id.includes('note'))
			expect(noteNode).toBeDefined()
			expect(noteNode!.label).toContain('SLA clock may pause here')
			expect(noteNode!.color).toBe('yellow')

			const noteEdge = blueprint.edges.find(
				(e) => e.startNodeId === 'WaitingForCustomer' && e.endNodeId.includes('note')
			)
			expect(noteEdge).toBeDefined()
			expect(noteEdge!.dash).toBe('dotted')
		})

		it('nested compound state with history node', async () => {
			const blueprint = await stateBlueprint(`stateDiagram-v2
  [*] --> Editor
  state Editor {
    [*] --> Viewing
    state Mode {
      [*] --> Select
      Select --> Draw: pen tool
      Draw --> Erase: eraser
      Erase --> Select: pointer
    }
    Viewing --> Mode: edit
    Mode --> Viewing: preview
    state H <<history>>
  }
  Editor --> Suspended: sleep
  Suspended --> H: wake`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()

			const compoundIds = ['Editor', 'Mode']
			for (const id of compoundIds) {
				const node = blueprint.nodes.find((n) => n.id === id)
				expect(node).toBeDefined()
				expect(node!.fill).toBe('semi')
			}

			const modeNode = blueprint.nodes.find((n) => n.id === 'Mode')
			expect(modeNode!.parentId).toBe('Editor')

			const selectNode = blueprint.nodes.find((n) => n.id === 'Select')
			expect(selectNode).toBeDefined()
			expect(selectNode!.parentId).toBe('Mode')

			const viewingNode = blueprint.nodes.find((n) => n.id === 'Viewing')
			expect(viewingNode).toBeDefined()
			expect(viewingNode!.parentId).toBe('Editor')

			const hNode = blueprint.nodes.find((n) => n.id === 'H')
			expect(hNode).toBeDefined()
			// Mermaid renders <<history>> nodes outside the visual cluster,
			// so H should NOT be parented to Editor in the blueprint.
			expect(hNode!.parentId).toBeUndefined()

			const edgeToMode = blueprint.edges.find(
				(e) => e.startNodeId === 'Viewing' && e.endNodeId === 'Mode'
			)
			expect(edgeToMode).toBeDefined()
			expect(edgeToMode!.label).toBe('edit')

			const edgeFromMode = blueprint.edges.find(
				(e) => e.startNodeId === 'Mode' && e.endNodeId === 'Viewing'
			)
			expect(edgeFromMode).toBeDefined()
			expect(edgeFromMode!.label).toBe('preview')

			const edgeSleep = blueprint.edges.find(
				(e) => e.startNodeId === 'Editor' && e.endNodeId === 'Suspended'
			)
			expect(edgeSleep).toBeDefined()

			const edgeWake = blueprint.edges.find(
				(e) => e.startNodeId === 'Suspended' && e.endNodeId === 'H'
			)
			expect(edgeWake).toBeDefined()
		})
	})

	describe('sequence diagram', () => {
		it('simple sequence diagram', async () => {
			const blueprint = await sequenceBlueprint(`sequenceDiagram
  Alice->>John: Hello John, how are you?
  John-->>Alice: Great!
  Alice-)John: See you later!`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('sequence diagram with loop, opt, and self-message', async () => {
			const blueprint = await sequenceBlueprint(`sequenceDiagram
  participant P as Producer
  participant Q as Queue
  participant W as Worker
  P->>Q: enqueue(job)
  loop poll
    W->>Q: dequeue()
    Q-->>W: job?
  end
  opt job received
    W->>W: execute()
  end`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('sequence diagram with notes', async () => {
			const blueprint = await sequenceBlueprint(`sequenceDiagram
  Alice->>John: Hello
  Note right of Alice: Alice thinks
  Note left of John: John ponders
  Note over Alice,John: Both see this
  John-->>Alice: Hi!`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()
		})

		it('sequence diagram with activation boxes', async () => {
			const blueprint = await sequenceBlueprint(`sequenceDiagram
  Alice->>+John: Hello John, how are you?
  Alice->>+John: John, can you hear me?
  John-->>-Alice: Hi Alice, I can hear you!
  John-->>-Alice: I feel great!`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()

			const activations = blueprint.nodes.filter((n) => n.id.startsWith('activation-'))
			expect(activations).toHaveLength(2)
			for (const act of activations) {
				expect(act.fill).toBe('solid')
				expect(act.color).toBe('light-violet')
				expect(act.geo).toBe('rectangle')
				expect(act.w).toBe(20)
				expect(act.h).toBeGreaterThan(0)
			}
		})

		it('sequence diagram with explicit activate/deactivate', async () => {
			const blueprint = await sequenceBlueprint(`sequenceDiagram
  participant Client
  participant API
  participant DB
  Client->>API: Get order
  activate API
  API->>DB: Query order
  activate DB
  DB-->>API: Order row
  deactivate DB
  API-->>Client: Order JSON
  deactivate API`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()

			const activations = blueprint.nodes.filter((n) => n.id.startsWith('activation-'))
			expect(activations).toHaveLength(2)

			const apiLifeline = blueprint.lines!.find((l) => l.id === 'lifeline-API')!
			const dbLifeline = blueprint.lines!.find((l) => l.id === 'lifeline-DB')!
			const dbAct = activations.find((a) => a.x === dbLifeline.x - 10)!
			const apiAct = activations.find((a) => a.x === apiLifeline.x - 10)!
			expect(apiAct).toBeDefined()
			expect(dbAct).toBeDefined()
			expect(apiAct.h).toBeGreaterThan(dbAct.h)
		})

		it('sequence diagram with autonumber', async () => {
			const blueprint = await sequenceBlueprint(`sequenceDiagram
  autonumber
  Alice->>Bob: Hello
  Bob-->>Alice: Hi
  Alice->>Bob: How are you?`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()

			expect(blueprint.edges).toHaveLength(3)
			expect(blueprint.edges[0].decoration).toEqual({ type: 'autonumber', value: '1' })
			expect(blueprint.edges[1].decoration).toEqual({ type: 'autonumber', value: '2' })
			expect(blueprint.edges[2].decoration).toEqual({ type: 'autonumber', value: '3' })
		})

		it('sequence diagram with create participant', async () => {
			const blueprint = await sequenceBlueprint(`sequenceDiagram
  participant User
  participant App
  User->>App: Start report generation
  create participant JobRunner
  App->>JobRunner: Spawn background job
  JobRunner-->>App: Job started
  App-->>User: Report is processing`)
			expect(normalizeBlueprint(blueprint)).toMatchSnapshot()

			const userTop = blueprint.nodes.find((n) => n.id === 'actor-top-User')!
			const jobRunnerTop = blueprint.nodes.find((n) => n.id === 'actor-top-JobRunner')!
			expect(jobRunnerTop).toBeDefined()
			expect(jobRunnerTop.y).toBeGreaterThan(userTop.y)

			const creationEdge = blueprint.edges.find((e) => e.label === 'Spawn background job')!
			expect(creationEdge.endNodeId).toBe('actor-top-JobRunner')
		})
	})
})
