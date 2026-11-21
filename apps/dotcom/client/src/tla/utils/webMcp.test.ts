import {
	Box,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	tipTapDefaultExtensions,
	type TLMeasureTextOpts,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APPLY_OPS_TOOL_NAME, READ_PAGE_TOOL_NAME, registerWebMcpTools } from './webMcp'

vi.mock('../../utils/analytics', () => ({ trackEvent: vi.fn() }))

function createTestEditor(): Editor {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const editor = new Editor({
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, ...defaultShapeTools],
		getContainer: () => container,
		textOptions: {
			addFontsFromNode: defaultAddFontsFromNode,
			tipTapConfig: { extensions: tipTapDefaultExtensions },
		},
	})
	editor.updateViewportScreenBounds(new Box(0, 0, 1280, 800))
	const measure = (text: string, opts: TLMeasureTextOpts) => {
		const w = Math.min(text.length * 16, opts.maxWidth ?? Infinity)
		return { w, h: 32, x: 0, y: 0, scrollWidth: w }
	}
	editor.textMeasure.measureText = measure
	editor.textMeasure.measureHtml = measure
	editor.textMeasure.measureHtmlBatch = (requests) => requests.map((r) => measure(r.html, r.opts))
	return editor
}

interface RegisteredTool {
	name: string
	inputSchema: object
	execute(input: unknown): Promise<{ content: [{ text: string }]; isError?: boolean }>
}

/** A stand-in for `document.modelContext` that unregisters on abort, as the spec has it. */
function installModelContext() {
	const tools = new Map<string, RegisteredTool>()
	const modelContext = {
		registerTool: vi.fn(async (tool: RegisteredTool, { signal }: { signal: AbortSignal }) => {
			tools.set(tool.name, tool)
			signal.addEventListener('abort', () => tools.delete(tool.name))
		}),
	}
	Object.defineProperty(document, 'modelContext', { value: modelContext, configurable: true })
	return {
		tools,
		async call(name: string, input: unknown) {
			const result = await tools.get(name)!.execute(input)
			return { isError: !!result.isError, text: result.content[0].text }
		},
	}
}

let editor: Editor
beforeEach(() => {
	editor = createTestEditor()
})
afterEach(() => {
	editor.dispose()
	delete (document as { modelContext?: unknown }).modelContext
})

describe('registerWebMcpTools', () => {
	it('does nothing in a browser without WebMCP', () => {
		expect(() => registerWebMcpTools(editor, { canEdit: true })()).not.toThrow()
	})

	it('registers both tools, and takes them away on cleanup', () => {
		const { tools } = installModelContext()
		const unregister = registerWebMcpTools(editor, { canEdit: true })
		expect([...tools.keys()]).toEqual([READ_PAGE_TOOL_NAME, APPLY_OPS_TOOL_NAME])
		unregister()
		expect([...tools.keys()]).toEqual([])
	})

	it('offers only the read tool on a board the user cannot edit', () => {
		const { tools } = installModelContext()
		registerWebMcpTools(editor, { canEdit: false })
		expect([...tools.keys()]).toEqual([READ_PAGE_TOOL_NAME])
	})

	it('applies ops as one undo step, stamped with the user, and reads them back', async () => {
		const { call } = installModelContext()
		registerWebMcpTools(editor, { canEdit: true, userId: 'user-1' })

		const applied = await call(APPLY_OPS_TOOL_NAME, {
			ops: [
				{ op: 'add', kind: 'box', id: 'a', text: 'Hello', at: { x: 0, y: 0 } },
				{ op: 'add', kind: 'box', id: 'b', text: 'Far away', at: { x: 5000, y: 5000 } },
			],
		})
		expect(applied.isError).toBe(false)
		expect(JSON.parse(applied.text)).toMatchObject({
			applied: 2,
			createdIds: ['a', 'b'],
			errors: [],
		})
		const shape = editor.getCurrentPageShapes().find((s) => s.id === 'shape:a')!
		expect(shape.meta.agent).toMatchObject({ userId: 'user-1' })

		const page = JSON.parse((await call(READ_PAGE_TOOL_NAME, {})).text)
		expect(page).toMatchObject({ page: 'Page 1', canEdit: true, shapeCount: 2 })
		expect(page.shapes.map((s: { text: string }) => s.text)).toEqual(['Hello', 'Far away'])

		const inView = JSON.parse((await call(READ_PAGE_TOOL_NAME, { scope: 'viewport' })).text)
		expect(inView.shapes.map((s: { id: string }) => s.id)).toEqual(['a'])

		editor.select('shape:b' as any)
		const selected = JSON.parse((await call(READ_PAGE_TOOL_NAME, { scope: 'selection' })).text)
		expect(selected.shapes.map((s: { id: string }) => s.id)).toEqual(['b'])

		editor.undo()
		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('reports invalid ops as a result the agent can read, applying nothing', async () => {
		const { call } = installModelContext()
		registerWebMcpTools(editor, { canEdit: true })
		const result = await call(APPLY_OPS_TOOL_NAME, { ops: [{ op: 'nope' }] })
		expect(result.isError).toBe(true)
		expect(result.text).toContain('Nothing was applied')
		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('refuses to edit once the board has become read-only', async () => {
		const { call } = installModelContext()
		registerWebMcpTools(editor, { canEdit: true })
		editor.updateInstanceState({ isReadonly: true })
		const result = await call(APPLY_OPS_TOOL_NAME, {
			ops: [{ op: 'add', kind: 'box', text: 'Hello', at: { x: 0, y: 0 } }],
		})
		expect(result).toEqual({
			isError: true,
			text: 'The user can only view this board, not edit it.',
		})
	})

	// Chrome refuses a schema it can't serialize, and a name outside this set, at registration.
	it('registers tools the spec accepts', () => {
		const { tools } = installModelContext()
		registerWebMcpTools(editor, { canEdit: true })
		for (const tool of tools.values()) {
			expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/)
			expect(() => JSON.stringify(tool.inputSchema)).not.toThrow()
		}
	})
})
