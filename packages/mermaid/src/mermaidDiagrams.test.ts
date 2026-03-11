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

async function flowchartBlueprint(text: string): Promise<DiagramMermaidBlueprint> {
	const { liveSvg, db, cleanup } = await prepareDiagram(text)
	try {
		const flowDb = db as FlowDB
		return flowchartToBlueprint(
			liveSvg,
			flowDb.getVertices() as Map<string, FlowVertex>,
			flowDb.getEdges() as FlowEdge[],
			flowDb.getSubGraphs() as FlowSubGraph[],
			flowDb.getClasses()
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
		return stateToBlueprint(
			liveSvg,
			stateDb.getStates(),
			stateDb.getRelations(),
			stateDb.getClasses()
		)
	} finally {
		cleanup()
	}
}

function findNode(bp: DiagramMermaidBlueprint, id: string) {
	return bp.nodes.find((n) => n.id === id)
}

function findNodeByLabel(bp: DiagramMermaidBlueprint, label: string) {
	return bp.nodes.find((n) => n.label === label)
}

function findEdge(bp: DiagramMermaidBlueprint, from: string, to: string) {
	return bp.edges.find((e) => e.startNodeId === from && e.endNodeId === to)
}

function hasPositiveSize(node: { w: number; h: number }) {
	expect(node.w).toBeGreaterThan(0)
	expect(node.h).toBeGreaterThan(0)
}

describe('blueprint tests', () => {
	describe('flowchart', () => {
		it('simple TD flowchart', async () => {
			const bp = await flowchartBlueprint(`flowchart TD
  A[Start] --> B{Is it?}
  B -->|Yes| C[OK]
  B ---->|No| E[End]`)

			expect(bp.nodes).toHaveLength(4)
			expect(bp.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'E'])

			const a = findNode(bp, 'A')!
			expect(a.label).toBe('Start')
			expect(a.geo).toBe('rectangle')
			hasPositiveSize(a)

			const b = findNode(bp, 'B')!
			expect(b.label).toBe('Is it?')
			expect(b.geo).toBe('diamond')

			expect(bp.edges).toHaveLength(3)
			const abEdge = findEdge(bp, 'A', 'B')!
			expect(abEdge).toBeDefined()
			expect(abEdge.arrowheadEnd).toBe('arrow')

			const bcEdge = findEdge(bp, 'B', 'C')!
			expect(bcEdge.label).toBe('Yes')

			const beEdge = findEdge(bp, 'B', 'E')!
			expect(beEdge.label).toBe('No')

			// TD layout: A should be above B
			expect(a.y).toBeLessThan(b.y)
		})

		it('LR flowchart', async () => {
			const bp = await flowchartBlueprint(`flowchart LR
  Start --> Stop`)

			expect(bp.nodes).toHaveLength(2)
			expect(bp.edges).toHaveLength(1)

			const start = findNodeByLabel(bp, 'Start')!
			const stop = findNodeByLabel(bp, 'Stop')!
			hasPositiveSize(start)
			hasPositiveSize(stop)

			// LR layout: Start should be to the left of Stop
			expect(start.x).toBeLessThan(stop.x)

			expect(bp.edges[0].startNodeId).toBe('Start')
			expect(bp.edges[0].endNodeId).toBe('Stop')
		})

		it('flowchart with subgraphs', async () => {
			const bp = await flowchartBlueprint(`flowchart TB
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

			const subgraphIds = ['one', 'two', 'three']
			for (const id of subgraphIds) {
				const sg = findNode(bp, id)
				expect(sg).toBeDefined()
				expect(sg!.fill).toBe('semi')
			}

			const leafIds = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
			for (const id of leafIds) {
				expect(findNode(bp, id)).toBeDefined()
			}

			expect(findNode(bp, 'a1')!.parentId).toBe('one')
			expect(findNode(bp, 'a2')!.parentId).toBe('one')
			expect(findNode(bp, 'b1')!.parentId).toBe('two')
			expect(findNode(bp, 'c1')!.parentId).toBe('three')

			expect(bp.edges.length).toBeGreaterThanOrEqual(3)
			expect(findEdge(bp, 'a1', 'a2')).toBeDefined()
			expect(findEdge(bp, 'b1', 'b2')).toBeDefined()
			expect(findEdge(bp, 'c1', 'c2')).toBeDefined()
			expect(findEdge(bp, 'c1', 'a2')).toBeDefined()
		})

		it('LR flowchart with parallel edges and self-loop', async () => {
			const bp = await flowchartBlueprint(`flowchart LR
  A[Client] -->|Request| B[Server]
  B -->|Response| A
  B --> C{Decision}
  C -->|Yes| D[Process]
  C -->|No| E[Reject]
  D --> D
  D --> F[Done]`)

			expect(bp.nodes).toHaveLength(6)
			expect(bp.edges).toHaveLength(7)

			expect(findEdge(bp, 'A', 'B')!.label).toBe('Request')
			expect(findEdge(bp, 'B', 'A')!.label).toBe('Response')

			const selfLoop = findEdge(bp, 'D', 'D')!
			expect(selfLoop).toBeDefined()
			expect(selfLoop.bend).not.toBe(0)

			expect(findNode(bp, 'C')!.geo).toBe('diamond')

			// LR: A should be left of B, B left of C
			expect(findNode(bp, 'A')!.x).toBeLessThan(findNode(bp, 'C')!.x)
		})

		it('TB flowchart with parallel edges and self-loop', async () => {
			const bp = await flowchartBlueprint(`flowchart TB
  A[Client] -->|Request| B[Server]
  B -->|Response| A
  B --> C{Decision}
  C -->|Yes| D[Process]
  C -->|No| E[Reject]
  D --> D
  D --> F[Done]`)

			expect(bp.nodes).toHaveLength(6)
			expect(bp.edges).toHaveLength(7)

			// TB: A should be above C
			expect(findNode(bp, 'A')!.y).toBeLessThan(findNode(bp, 'C')!.y)
		})

		it('flowchart with classDef fills', async () => {
			const bp = await flowchartBlueprint(`flowchart TD
  A[Start] --> B[End]
  classDef green fill:#00ff00
  classDef blue fill:#0000ff
  class A green
  class B blue`)

			const startNode = findNodeByLabel(bp, 'Start')!
			expect(startNode.fill).toBe('solid')
			expect(startNode.color).toBe('light-green')

			const endNode = findNodeByLabel(bp, 'End')!
			expect(endNode.fill).toBe('solid')
			expect(endNode.color).toBe('blue')
		})

		it('flowchart with classDef fill+stroke', async () => {
			const bp = await flowchartBlueprint(`flowchart TD
  A[API Gateway] --> B[Auth Service]
  B --> C[(Users DB)]
  classDef svc fill:#e3f2fd,stroke:#1565c0;
  classDef db fill:#f3e5f5,stroke:#6a1b9a;
  class A,B svc;
  class C db;`)

			const svcNode = findNodeByLabel(bp, 'Auth Service')!
			expect(svcNode.fill).toBe('solid')
			expect(svcNode.color).toBe('blue')

			const dbNode = findNodeByLabel(bp, 'Users DB')!
			expect(dbNode.fill).toBe('solid')
			expect(dbNode.color).toBe('violet')
		})

		it('flowchart with inline style directives', async () => {
			const bp = await flowchartBlueprint(`flowchart TD
  A[Request] --> B[Validation]
  B --> C[Success]
  B --> D[Failure]
  style B fill:#fff4cc,stroke:#cc9900,stroke-width:2px
  style C fill:#e8f5e9,stroke:#2e7d32
  style D fill:#ffebee,stroke:#c62828`)

			expect(findNodeByLabel(bp, 'Validation')!.fill).toBe('solid')
			expect(findNodeByLabel(bp, 'Validation')!.color).toBe('orange')
			expect(findNodeByLabel(bp, 'Success')!.fill).toBe('solid')
			expect(findNodeByLabel(bp, 'Success')!.color).toBe('green')
			expect(findNodeByLabel(bp, 'Failure')!.fill).toBe('solid')
			expect(findNodeByLabel(bp, 'Failure')!.color).toBe('red')
			expect(findNodeByLabel(bp, 'Request')!.fill).toBeUndefined()
		})

		it('flowchart with linkStyle color and dash', async () => {
			const bp = await flowchartBlueprint(`flowchart LR
  A[Client] -->|GET| B[API]
  A -->|POST| B
  B -->|200| A
  B -->|400| A
  linkStyle 0 stroke:#2a7,stroke-width:2px
  linkStyle 1 stroke:#27a,stroke-width:2px,stroke-dasharray: 4 3`)

			expect(bp.nodes).toHaveLength(2)
			expect(bp.edges).toHaveLength(4)

			expect(bp.edges[0].label).toBe('GET')
			expect(bp.edges[1].label).toBe('POST')
			expect(bp.edges[1].dash).toBe('dashed')
		})
	})

	describe('state diagram', () => {
		it('simple state diagram', async () => {
			const bp = await stateBlueprint(`stateDiagram-v2
  [*] --> Still
  Still --> Moving
  Moving --> Still
  Moving --> Crash
  Crash --> [*]`)

			const still = findNode(bp, 'Still')!
			expect(still).toBeDefined()
			expect(still.label).toBe('Still')
			expect(still.geo).toBe('rectangle')
			hasPositiveSize(still)

			expect(findNode(bp, 'Moving')).toBeDefined()
			expect(findNode(bp, 'Crash')).toBeDefined()

			// Start/end pseudo-states
			const startNodes = bp.nodes.filter((n) => n.id.includes('_start'))
			expect(startNodes.length).toBeGreaterThanOrEqual(1)
			const endNodes = bp.nodes.filter((n) => n.id.includes('_end'))
			expect(endNodes.length).toBeGreaterThanOrEqual(1)

			expect(bp.edges.length).toBeGreaterThanOrEqual(5)
			expect(findEdge(bp, 'Still', 'Moving')).toBeDefined()
			expect(findEdge(bp, 'Moving', 'Still')).toBeDefined()
			expect(findEdge(bp, 'Moving', 'Crash')).toBeDefined()
		})

		it('state diagram with classDef fills', async () => {
			const bp = await stateBlueprint(`stateDiagram-v2
  [*] --> Idle
  Idle --> Active : start
  Active --> [*]
  classDef green fill:#00ff00
  classDef red fill:#ff0000
  class Idle green
  class Active red`)

			const idle = findNode(bp, 'Idle')!
			expect(idle.fill).toBe('solid')
			expect(idle.color).toBe('light-green')

			const active = findNode(bp, 'Active')!
			expect(active.fill).toBe('solid')
			expect(active.color).toBe('red')
		})

		it('compound state with bidirectional edges and self-loop', async () => {
			const bp = await stateBlueprint(`stateDiagram-v2
  [*] --> Session
  state Session {
    [*] --> Unauthed
    Unauthed --> Authed: login
    Authed --> Unauthed: logout
    Authed --> Authed: refresh
  }
  Session --> [*]: close`)

			const session = findNode(bp, 'Session')!
			expect(session).toBeDefined()
			expect(session.fill).toBe('semi')

			expect(findNode(bp, 'Unauthed')!.parentId).toBe('Session')
			expect(findNode(bp, 'Authed')!.parentId).toBe('Session')

			const loginEdge = findEdge(bp, 'Unauthed', 'Authed')!
			expect(loginEdge).toBeDefined()
			expect(loginEdge.label).toBe('login')

			const logoutEdge = findEdge(bp, 'Authed', 'Unauthed')!
			expect(logoutEdge).toBeDefined()
			expect(logoutEdge.label).toBe('logout')

			const selfLoop = findEdge(bp, 'Authed', 'Authed')!
			expect(selfLoop).toBeDefined()
			expect(selfLoop.label).toBe('refresh')
			expect(selfLoop.bend).not.toBe(0)
		})

		it('compound state diagram', async () => {
			const bp = await stateBlueprint(`stateDiagram-v2
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

			expect(findNode(bp, 'First')!.fill).toBe('semi')
			expect(findNode(bp, 'Second')!.fill).toBe('semi')

			expect(findNode(bp, 'fA')!.parentId).toBe('First')
			expect(findNode(bp, 'sA')!.parentId).toBe('Second')
		})

		it('state diagram with notes', async () => {
			const bp = await stateBlueprint(`stateDiagram-v2
  [*] --> TicketOpen
  TicketOpen --> Investigating: assign
  Investigating --> WaitingForCustomer: need info
  WaitingForCustomer --> Investigating: reply received
  Investigating --> Resolved: fix applied
  Resolved --> Closed: confirm
  note right of WaitingForCustomer
    SLA clock may pause here
  end note`)

			expect(findNode(bp, 'TicketOpen')).toBeDefined()
			expect(findNode(bp, 'Investigating')).toBeDefined()
			expect(findNode(bp, 'WaitingForCustomer')).toBeDefined()
			expect(findNode(bp, 'Resolved')).toBeDefined()
			expect(findNode(bp, 'Closed')).toBeDefined()

			const noteNode = bp.nodes.find((n) => n.id.includes('note'))
			expect(noteNode).toBeDefined()
			expect(noteNode!.label).toContain('SLA clock may pause here')
			expect(noteNode!.color).toBe('yellow')

			const noteEdge = bp.edges.find(
				(e) => e.startNodeId === 'WaitingForCustomer' && e.endNodeId.includes('note')
			)
			expect(noteEdge).toBeDefined()
			expect(noteEdge!.dash).toBe('dotted')
		})

		it('nested compound state with history node', async () => {
			const bp = await stateBlueprint(`stateDiagram-v2
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

			const editor = findNode(bp, 'Editor')!
			expect(editor).toBeDefined()
			expect(editor.fill).toBe('semi')

			const mode = findNode(bp, 'Mode')!
			expect(mode).toBeDefined()
			expect(mode.fill).toBe('semi')
			expect(mode.parentId).toBe('Editor')

			expect(findNode(bp, 'Select')!.parentId).toBe('Mode')
			expect(findNode(bp, 'Viewing')!.parentId).toBe('Editor')

			const hNode = findNode(bp, 'H')!
			expect(hNode).toBeDefined()
			expect(hNode.parentId).toBeUndefined()

			expect(findEdge(bp, 'Viewing', 'Mode')!.label).toBe('edit')
			expect(findEdge(bp, 'Mode', 'Viewing')!.label).toBe('preview')
			expect(findEdge(bp, 'Editor', 'Suspended')).toBeDefined()
			expect(findEdge(bp, 'Suspended', 'H')).toBeDefined()
		})
	})

	describe('sequence diagram', () => {
		it('simple sequence diagram', async () => {
			const bp = await sequenceBlueprint(`sequenceDiagram
  Alice->>John: Hello John, how are you?
  John-->>Alice: Great!
  Alice-)John: See you later!`)

			expect(bp.edges).toHaveLength(3)
			expect(bp.edges[0].label).toBe('Hello John, how are you?')
			expect(bp.edges[0].dash).toBe('solid')
			expect(bp.edges[0].arrowheadEnd).toBe('arrow')
			expect(bp.edges[1].label).toBe('Great!')
			expect(bp.edges[1].dash).toBe('dotted')
			expect(bp.edges[2].label).toBe('See you later!')

			const aliceTop = findNode(bp, 'actor-top-Alice')!
			const johnTop = findNode(bp, 'actor-top-John')!
			expect(aliceTop).toBeDefined()
			expect(johnTop).toBeDefined()
			hasPositiveSize(aliceTop)

			// Alice should be to the left of John
			expect(aliceTop.x).toBeLessThan(johnTop.x)

			expect(bp.lines!.find((l) => l.id === 'lifeline-Alice')).toBeDefined()
			expect(bp.lines!.find((l) => l.id === 'lifeline-John')).toBeDefined()

			expect(bp.groups).toEqual([
				['actor-top-Alice', 'lifeline-Alice', 'actor-bottom-Alice'],
				['actor-top-John', 'lifeline-John', 'actor-bottom-John'],
			])
		})

		it('sequence diagram with loop, opt, and self-message', async () => {
			const bp = await sequenceBlueprint(`sequenceDiagram
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

			expect(bp.edges.length).toBeGreaterThanOrEqual(4)
			expect(bp.edges[0].label).toBe('enqueue(job)')

			const selfMsg = bp.edges.find(
				(e) => e.startNodeId === 'lifeline-W' && e.endNodeId === 'lifeline-W'
			)
			expect(selfMsg).toBeDefined()
			expect(selfMsg!.label).toBe('execute()')
			expect(selfMsg!.bend).not.toBe(0)

			const loopFragment = findNode(bp, 'fragment-0')
			expect(loopFragment).toBeDefined()
			expect(loopFragment!.label).toContain('loop')

			const optFragment = findNode(bp, 'fragment-1')
			expect(optFragment).toBeDefined()
			expect(optFragment!.label).toContain('opt')
		})

		it('sequence diagram with notes', async () => {
			const bp = await sequenceBlueprint(`sequenceDiagram
  Alice->>John: Hello
  Note right of Alice: Alice thinks
  Note left of John: John ponders
  Note over Alice,John: Both see this
  John-->>Alice: Hi!`)

			const notes = bp.nodes.filter((n) => n.id.startsWith('note-'))
			expect(notes).toHaveLength(3)
			for (const note of notes) {
				expect(note.color).toBe('yellow')
				expect(note.fill).toBe('solid')
				expect(note.geo).toBe('rectangle')
			}

			expect(notes.map((n) => n.label)).toEqual(['Alice thinks', 'John ponders', 'Both see this'])
		})

		it('sequence diagram with activation boxes', async () => {
			const bp = await sequenceBlueprint(`sequenceDiagram
  Alice->>+John: Hello John, how are you?
  Alice->>+John: John, can you hear me?
  John-->>-Alice: Hi Alice, I can hear you!
  John-->>-Alice: I feel great!`)

			const activations = bp.nodes.filter((n) => n.id.startsWith('activation-'))
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
			const bp = await sequenceBlueprint(`sequenceDiagram
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

			const activations = bp.nodes.filter((n) => n.id.startsWith('activation-'))
			expect(activations).toHaveLength(2)

			const apiLifeline = bp.lines!.find((l) => l.id === 'lifeline-API')!
			const dbLifeline = bp.lines!.find((l) => l.id === 'lifeline-DB')!
			const dbAct = activations.find((a) => a.x === dbLifeline.x - 10)!
			const apiAct = activations.find((a) => a.x === apiLifeline.x - 10)!
			expect(apiAct).toBeDefined()
			expect(dbAct).toBeDefined()
			expect(apiAct.h).toBeGreaterThan(dbAct.h)
		})

		it('sequence diagram with autonumber', async () => {
			const bp = await sequenceBlueprint(`sequenceDiagram
  autonumber
  Alice->>Bob: Hello
  Bob-->>Alice: Hi
  Alice->>Bob: How are you?`)

			expect(bp.edges).toHaveLength(3)
			expect(bp.edges[0].decoration).toEqual({ type: 'autonumber', value: '1' })
			expect(bp.edges[1].decoration).toEqual({ type: 'autonumber', value: '2' })
			expect(bp.edges[2].decoration).toEqual({ type: 'autonumber', value: '3' })
		})

		it('sequence diagram with alt/else', async () => {
			const bp = await sequenceBlueprint(`sequenceDiagram
  participant User
  participant App
  User->>App: Sign in
  alt Credentials valid
    App-->>User: Redirect to dashboard
  else Credentials invalid
    App-->>User: Show error message
  end`)

			const fragmentBox = findNode(bp, 'fragment-0')
			expect(fragmentBox).toBeDefined()
			expect(fragmentBox!.label).toBe('alt [Credentials valid]')

			const sepLine = bp.lines!.find((l) => l.id === 'fragment-0-sep-1')
			expect(sepLine).toBeDefined()
			expect(sepLine!.endY).toBe(0)
			expect(sepLine!.endX).toBeGreaterThan(0)
			expect(sepLine!.dash).toBe('dashed')

			const sectionLabel = bp.nodes.find((n) => n.id === 'fragment-0-section-1')
			expect(sectionLabel).toBeDefined()
			expect(sectionLabel!.label).toBe('[Credentials invalid]')
		})

		it('sequence diagram with create participant', async () => {
			const bp = await sequenceBlueprint(`sequenceDiagram
  participant User
  participant App
  User->>App: Start report generation
  create participant JobRunner
  App->>JobRunner: Spawn background job
  JobRunner-->>App: Job started
  App-->>User: Report is processing`)

			const userTop = findNode(bp, 'actor-top-User')!
			const jobRunnerTop = findNode(bp, 'actor-top-JobRunner')!
			expect(jobRunnerTop).toBeDefined()
			expect(jobRunnerTop.y).toBeGreaterThan(userTop.y)

			const creationEdge = bp.edges.find((e) => e.label === 'Spawn background job')!
			expect(creationEdge.endNodeId).toBe('actor-top-JobRunner')
		})
	})
})
