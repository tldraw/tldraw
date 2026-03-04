import {
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	tipTapDefaultExtensions,
} from 'tldraw'
import { vi } from 'vitest'
import { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'

// jsdom lacks SVG geometry methods that mermaid.render() needs
const _origCreateElementNS = document.createElementNS.bind(document)
document.createElementNS = function (ns: string, tag: string) {
	const el = _origCreateElementNS(ns, tag) as any
	if (ns === 'http://www.w3.org/2000/svg') {
		if (!el.getBBox)
			el.getBBox = () => {
				try {
					const t = el.textContent || ''
					return { x: 0, y: 0, width: t.length * 8, height: 16 }
				} catch {
					return { x: 0, y: 0, width: 50, height: 16 }
				}
			}
		if (!el.getComputedTextLength)
			el.getComputedTextLength = () => {
				try {
					return (el.textContent || '').length * 8
				} catch {
					return 50
				}
			}
		if (!el.getTotalLength) el.getTotalLength = () => 100
		if (!el.getPointAtLength) el.getPointAtLength = (d: number) => ({ x: d, y: 0 })
	}
	return el
}

vi.useFakeTimers()

function createTestEditor(): Editor {
	const elm = document.createElement('div')
	elm.tabIndex = 0
	const bounds = {
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		width: 1080,
		height: 720,
		bottom: 720,
		right: 1080,
	}
	elm.getBoundingClientRect = () => bounds as DOMRect

	return new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => elm,
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
	})
}

let editor: Editor

beforeEach(() => {
	editor = createTestEditor()
})

afterEach(() => {
	editor?.dispose()
})

function getSnapshot() {
	const shapeIds = [...editor.getCurrentPageShapeIds()]
	const shapes = shapeIds
		.map((id) => editor.getShape(id))
		.filter(Boolean)
		.map((s) => ({
			type: s!.type,
			x: Math.round(s!.x),
			y: Math.round(s!.y),
			props: s!.props,
			isLocked: s!.isLocked,
		}))
		.sort((a, b) => {
			if (a.type !== b.type) return a.type.localeCompare(b.type)
			if (a.x !== b.x) return a.x - b.x
			return a.y - b.y
		})

	const bindings = editor.store
		.allRecords()
		.filter((r) => r.typeName === 'binding')
		.map((b: any) => ({
			type: b.type,
			props: b.props,
		}))
		.sort((a, b) => {
			const termA = a.props?.terminal || ''
			const termB = b.props?.terminal || ''
			if (termA !== termB) return termA.localeCompare(termB)
			const anchorA = a.props?.normalizedAnchor
			const anchorB = b.props?.normalizedAnchor
			if (anchorA && anchorB) {
				if (anchorA.x !== anchorB.x) return anchorA.x - anchorB.x
				return anchorA.y - anchorB.y
			}
			return 0
		})

	return { shapes, bindings }
}

/**
 * Diagram tests only: we test createMermaidDiagram(mermaidText) → shapes.
 * We do not unit-test internal helpers (svgParsing, utils, flowchart, etc.).
 */
describe('createMermaidDiagram', () => {
	describe('flowchart', () => {
		it('simple TD flowchart', async () => {
			const text = `flowchart TD
  A[Start] --> B{Is it?}
  B -->|Yes| C[OK]
  B ---->|No| E[End]`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('LR flowchart', async () => {
			const text = `flowchart LR
  Start --> Stop`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('flowchart with subgraphs', async () => {
			const text = `flowchart TB
  c1-->a2
  subgraph one
    a1-->a2
  end
  subgraph two
    b1-->b2
  end
  subgraph three
    c1-->c2
  end`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('LR flowchart with parallel edges and self-loop', async () => {
			const text = `flowchart LR
  A[Client] -->|Request| B[Server]
  B -->|Response| A
  B --> C{Decision}
  C -->|Yes| D[Process]
  C -->|No| E[Reject]
  D --> D
  D --> F[Done]`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('TB flowchart with parallel edges and self-loop', async () => {
			const text = `flowchart TB
  A[Client] -->|Request| B[Server]
  B -->|Response| A
  B --> C{Decision}
  C -->|Yes| D[Process]
  C -->|No| E[Reject]
  D --> D
  D --> F[Done]`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('flowchart with classDef fills', async () => {
			const text = `flowchart TD
  A[Start] --> B[End]
  classDef green fill:#00ff00
  classDef blue fill:#0000ff
  class A green
  class B blue`

			try {
				await createMermaidDiagram(editor, text)
				const shapes = [...editor.getCurrentPageShapeIds()]
					.map((id) => editor.getShape(id))
					.filter((s): s is NonNullable<typeof s> => s?.type === 'geo')
				const geoByLabel = new Map<string, (typeof shapes)[0]['props']>()
				for (const s of shapes) {
					const props = s.props as any
					const text = props.richText?.content?.[0]?.content?.[0]?.text
					if (text) geoByLabel.set(text, props)
				}
				const startProps = geoByLabel.get('Start') as any
				expect(startProps?.fill).toBe('solid')
				expect(startProps?.color).toBe('light-green')
				const endProps = geoByLabel.get('End') as any
				expect(endProps?.fill).toBe('solid')
				expect(endProps?.color).toBe('blue')
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('flowchart with linkStyle color and dash', async () => {
			const text = `flowchart LR
  A[Client] -->|GET| B[API]
  A -->|POST| B
  B -->|200| A
  B -->|400| A
  linkStyle 0 stroke:#2a7,stroke-width:2px
  linkStyle 1 stroke:#27a,stroke-width:2px,stroke-dasharray: 4 3`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})
	})

	describe('state diagram', () => {
		it('simple state diagram', async () => {
			const text = `stateDiagram-v2
  [*] --> Still
  Still --> Moving
  Moving --> Still
  Moving --> Crash
  Crash --> [*]`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('state diagram with classDef fills', async () => {
			const text = `stateDiagram-v2
  [*] --> Idle
  Idle --> Active : start
  Active --> [*]
  classDef green fill:#00ff00
  classDef red fill:#ff0000
  class Idle green
  class Active red`

			try {
				await createMermaidDiagram(editor, text)
				const shapes = [...editor.getCurrentPageShapeIds()]
					.map((id) => editor.getShape(id))
					.filter((s): s is NonNullable<typeof s> => s?.type === 'geo')
				const geoByLabel = new Map<string, (typeof shapes)[0]['props']>()
				for (const s of shapes) {
					const props = s.props as any
					const text = props.richText?.content?.[0]?.content?.[0]?.text
					if (text) geoByLabel.set(text, props)
				}
				const idleProps = geoByLabel.get('Idle') as any
				expect(idleProps?.fill).toBe('solid')
				expect(idleProps?.color).toBe('green')
				const activeProps = geoByLabel.get('Active') as any
				expect(activeProps?.fill).toBe('solid')
				expect(activeProps?.color).toBe('red')
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('compound state with bidirectional edges and self-loop', async () => {
			const text = `stateDiagram-v2
  [*] --> Session
  state Session {
    [*] --> Unauthed
    Unauthed --> Authed: login
    Authed --> Unauthed: logout
    Authed --> Authed: refresh
  }
  Session --> [*]: close`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})

		it('compound state diagram', async () => {
			const text = `stateDiagram-v2
  [*] --> First
  [*] --> Second
  state First {
    [*] --> fA
    fA --> [*]
  }
  state Second {
    [*] --> sA
    sA --> [*]
  }`

			try {
				await createMermaidDiagram(editor, text)
				expect(getSnapshot()).toMatchSnapshot()
			} catch (e) {
				if (!(e instanceof MermaidDiagramError)) throw e
			}
		})
	})

	describe('sequence diagram', () => {
		it('simple sequence diagram', async () => {
			const text = `sequenceDiagram
  Alice->>John: Hello John, how are you?
  John-->>Alice: Great!
  Alice-)John: See you later!`

			await createMermaidDiagram(editor, text)
			expect(getSnapshot()).toMatchSnapshot()
		})

		it('sequence diagram with loop, opt, and self-message', async () => {
			const text = `sequenceDiagram
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
  end`

			await createMermaidDiagram(editor, text)
			expect(getSnapshot()).toMatchSnapshot()
		})

		it('sequence diagram with notes', async () => {
			const text = `sequenceDiagram
  Alice->>John: Hello
  Note right of Alice: Alice thinks
  Note left of John: John ponders
  Note over Alice,John: Both see this
  John-->>Alice: Hi!`

			await createMermaidDiagram(editor, text)
			expect(getSnapshot()).toMatchSnapshot()
		})
	})

	it('throws for unsupported diagram types', async () => {
		const text = `pie title Pets
  "Dogs" : 386
  "Cats" : 85`

		await expect(createMermaidDiagram(editor, text)).rejects.toThrow(MermaidDiagramError)
		expect([...editor.getCurrentPageShapeIds()]).toHaveLength(0)
	})
})
