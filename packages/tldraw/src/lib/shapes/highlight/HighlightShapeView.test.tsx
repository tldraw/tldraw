import { existsSync, readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { act, render } from '@testing-library/react'
import {
	Editor,
	TLHighlightShape,
	TldrawEditor,
	createDefaultPlugins,
	createKernelPlugins,
	createShapeId,
	createTLStore,
} from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { renderTldrawComponentWithEditor } from '../../../test/testutils/renderTldrawComponent'
import { defaultShapePlugins } from '../../defaultPlugins'
import { defaultShapeUtils } from '../../defaultShapeUtils'
import { defaultTools } from '../../defaultTools'
import { Tldraw } from '../../Tldraw'
import { createDrawSegments } from '../../utils/test-helpers'
import { HighlightShapeUtil } from './HighlightShapeUtil'

const id = createShapeId('highlight')
const segments = createDrawSegments([
	[
		{ x: 0, y: 0, z: 0.5 },
		{ x: 50, y: 20, z: 0.5 },
		{ x: 100, y: 0, z: 0.5 },
	],
])

function createHighlight(editor: Editor) {
	editor.createShape<TLHighlightShape>({ id, type: 'highlight', props: { segments } })
}

function highlightPaths() {
	return document.querySelectorAll('[data-shape-type="highlight"] path')
}

describe('the highlight shape view', () => {
	it('draws and exports the shape in an editor built from shapeUtils, without the tldraw plugins', async () => {
		let resolveMount!: (editor: Editor) => void
		const mounted = new Promise<Editor>((r) => (resolveMount = r))
		render(
			<TldrawEditor
				shapeUtils={defaultShapeUtils}
				onMount={(editor) => {
					createHighlight(editor)
					resolveMount(editor)
				}}
			/>
		)
		await mounted
		await act(async () => {})
		expect(highlightPaths().length).toBeGreaterThan(0)

		const editor = new TestEditor({
			plugins: createDefaultPlugins(),
			shapeUtils: defaultShapeUtils,
			tools: defaultTools,
		})
		createHighlight(editor)
		vi.useRealTimers()
		const svg = await editor.getSvgString([id])
		expect(svg?.svg).toContain('<path')
	})

	it('lets a subclass override component and call super', async () => {
		class MyHighlightShapeUtil extends HighlightShapeUtil {
			override component(shape: TLHighlightShape) {
				return <div data-testid="my-highlight">{super.component(shape)}</div>
			}
		}
		const shapeUtils = [MyHighlightShapeUtil]
		await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					shapeUtils={shapeUtils}
					onMount={(editor) => {
						createHighlight(editor)
						onMount(editor)
					}}
				/>
			),
			{ waitForPatterns: false }
		)
		const mine = document.querySelector('[data-testid="my-highlight"]')
		expect(mine?.querySelector('path')).not.toBeNull()
	})
})

describe('the highlight shape util', () => {
	it('works in an editor with no React plugins', () => {
		const highlightShape = defaultShapePlugins.find((p) => p.id === 'highlightShape')!
		const editor = new Editor({
			plugins: [...createKernelPlugins(), highlightShape],
			shapeUtils: [],
			bindingUtils: [],
			tools: defaultTools,
			store: createTLStore({ shapeUtils: [HighlightShapeUtil], bindingUtils: [] }),
			getContainer: () => document.body,
		})
		createHighlight(editor)
		const util = editor.getShapeUtil<HighlightShapeUtil>('highlight')
		expect(util.getView()).toBeUndefined()
		expect(util.component(editor.getShape<TLHighlightShape>(id)!)).toBeNull()
		expect(editor.getShapePageBounds(id)!.width).toBeGreaterThan(90)
		editor.resizeShape(id, { x: 2, y: 1 })
		expect(editor.getShape<TLHighlightShape>(id)!.props.scaleX).toBe(2)
	})

	it('imports no React code', () => {
		// Walk the util's relative imports. Each file must be a .ts module without a React import.
		// `@tldraw/editor` still includes its React layer until the kernel moves to its own package.
		const seen = new Set<string>()
		const visit = (file: string) => {
			if (seen.has(file)) return
			seen.add(file)
			expect(file).not.toMatch(/\.tsx$/)
			const source = readFileSync(file, 'utf8')
			expect(source).not.toMatch(/from 'react'/)
			for (const [, spec] of source.matchAll(/from '(\.[^']+)'/g)) {
				const base = resolve(dirname(file), spec)
				const next = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(existsSync)
				if (!next) throw Error(`Cannot resolve ${spec} from ${file}`)
				visit(next)
			}
		}
		visit(join(__dirname, 'HighlightShapeUtil.ts'))
		expect(seen.size).toBeGreaterThan(1)
	})
})
