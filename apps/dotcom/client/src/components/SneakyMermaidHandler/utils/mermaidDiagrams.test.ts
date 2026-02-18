import {
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	tipTapDefaultExtensions,
} from 'tldraw'
import { vi } from 'vitest'
import { createMermaidDiagram, UnsupportedMermaidDiagramError } from './createMermaidDiagram'

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
			return termA.localeCompare(termB)
		})

	return { shapes, bindings }
}

describe('createMermaidDiagram', () => {
	describe('flowchart', () => {
		it('simple TD flowchart', async () => {
			const text = `flowchart TD
  A[Start] --> B{Is it?}
  B -->|Yes| C[OK]
  B ---->|No| E[End]`

			await createMermaidDiagram(editor, text)
			expect(getSnapshot()).toMatchSnapshot()
		})

		it('LR flowchart', async () => {
			const text = `flowchart LR
  Start --> Stop`

			await createMermaidDiagram(editor, text)
			expect(getSnapshot()).toMatchSnapshot()
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

			await createMermaidDiagram(editor, text)
			const snapshot = getSnapshot()
			expect(snapshot).toMatchSnapshot()

			const frames = snapshot.shapes.filter((s) => s.type === 'frame')
			expect(frames).toHaveLength(3)
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

			await createMermaidDiagram(editor, text)
			const snapshot = getSnapshot()
			expect(snapshot).toMatchSnapshot()

			const arrows = snapshot.shapes.filter((s) => s.type === 'arrow')
			expect(arrows.length).toBe(7)
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

			await createMermaidDiagram(editor, text)
			const snapshot = getSnapshot()
			expect(snapshot).toMatchSnapshot()

			const arrows = snapshot.shapes.filter((s) => s.type === 'arrow')
			expect(arrows.length).toBe(7)
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

			await createMermaidDiagram(editor, text)
			expect(getSnapshot()).toMatchSnapshot()
		})
	})

	describe('sequence diagram', () => {
		it('simple sequence diagram', async () => {
			const text = `sequenceDiagram
  Alice->>John: Hello John, how are you?
  John-->>Alice: Great!
  Alice-)John: See you later!`

			await createMermaidDiagram(editor, text)
			const snapshot = getSnapshot()
			expect(snapshot).toMatchSnapshot()

			const geoShapes = snapshot.shapes.filter((s) => s.type === 'geo')
			expect(geoShapes).toHaveLength(4)

			const arrowShapes = snapshot.shapes.filter((s) => s.type === 'arrow')
			expect(arrowShapes.length).toBeGreaterThanOrEqual(5)

			expect(snapshot.bindings.length).toBeGreaterThanOrEqual(4)
		})
	})

	it('throws for unsupported diagram types', async () => {
		const text = `pie title Pets
  "Dogs" : 386
  "Cats" : 85`

		await expect(createMermaidDiagram(editor, text)).rejects.toThrow(UnsupportedMermaidDiagramError)
		expect([...editor.getCurrentPageShapeIds()]).toHaveLength(0)
	})
})
