import { TLExternalContent, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import {
	handleNativeOrMenuCopy,
	putPastedExternalContent,
} from '../../lib/ui/hooks/useClipboardEvents'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
}

afterEach(() => {
	editor?.dispose()
})

describe('putPastedExternalContent', () => {
	it('calls putExternalContent when no hook is set', async () => {
		editor = new TestEditor()
		const spy = vi.spyOn(editor, 'putExternalContent').mockResolvedValue()
		const content: TLExternalContent<unknown> = {
			type: 'text',
			text: 'hello',
		}
		await putPastedExternalContent(editor, content, { source: 'native' })
		expect(spy).toHaveBeenCalledWith(content)
		spy.mockRestore()
	})

	it('calls putExternalContent when hook returns undefined', async () => {
		editor = new TestEditor({
			options: { onBeforePasteFromClipboard: () => undefined },
		})
		const spy = vi.spyOn(editor, 'putExternalContent').mockResolvedValue()
		const content: TLExternalContent<unknown> = {
			type: 'text',
			text: 'hello',
		}
		await putPastedExternalContent(editor, content, { source: 'native' })
		expect(spy).toHaveBeenCalledWith(content)
		spy.mockRestore()
	})

	it('does not call putExternalContent when hook returns false', async () => {
		editor = new TestEditor({
			options: { onBeforePasteFromClipboard: () => false },
		})
		const spy = vi.spyOn(editor, 'putExternalContent').mockResolvedValue()
		const content: TLExternalContent<unknown> = {
			type: 'text',
			text: 'hello',
		}
		await putPastedExternalContent(editor, content, { source: 'native' })
		expect(spy).not.toHaveBeenCalled()
		spy.mockRestore()
	})

	it('passes modified content when hook returns a new object', async () => {
		const modified: TLExternalContent<unknown> = {
			type: 'text',
			text: 'modified',
		}
		editor = new TestEditor({
			options: { onBeforePasteFromClipboard: () => modified },
		})
		const spy = vi.spyOn(editor, 'putExternalContent').mockResolvedValue()
		await putPastedExternalContent(editor, { type: 'text', text: 'original' }, { source: 'native' })
		expect(spy).toHaveBeenCalledWith(modified)
		spy.mockRestore()
	})

	it('receives editor and content in the hook info', async () => {
		const hookFn = vi.fn(() => undefined)
		editor = new TestEditor({
			options: { onBeforePasteFromClipboard: hookFn },
		})
		vi.spyOn(editor, 'putExternalContent').mockResolvedValue()
		const content: TLExternalContent<unknown> = {
			type: 'text',
			text: 'test',
		}
		await putPastedExternalContent(editor, content, { source: 'native' })
		expect(hookFn).toHaveBeenCalledWith({
			editor,
			content,
			source: 'native',
			point: undefined,
		})
	})
})

describe('handleNativeOrMenuCopy', () => {
	const doMockClipboard = () => {
		const written: any[] = []
		Object.assign(window.navigator, {
			clipboard: {
				write: vi.fn((content: any) => {
					written.push(content)
				}),
				writeText: vi.fn(),
			},
		})
		globalThis.ClipboardItem = vi.fn((payload: any) => payload) as any
		return written
	}

	it('writes to clipboard when no hook is set', async () => {
		doMockClipboard()
		editor = new TestEditor()
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
		editor.selectAll()
		await handleNativeOrMenuCopy(editor)
		expect(window.navigator.clipboard.write).toHaveBeenCalled()
	})

	it('does not write to clipboard when hook returns false', async () => {
		doMockClipboard()
		editor = new TestEditor({
			options: { onBeforeCopyToClipboard: () => false },
		})
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
		editor.selectAll()
		const didCopy = await handleNativeOrMenuCopy(editor)
		expect(didCopy).toBe(false)
		expect(window.navigator.clipboard.write).not.toHaveBeenCalled()
	})

	it('passes the content to the hook', async () => {
		doMockClipboard()
		const hookFn = vi.fn(() => undefined)
		editor = new TestEditor({
			options: { onBeforeCopyToClipboard: hookFn },
		})
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
		editor.selectAll()
		await handleNativeOrMenuCopy(editor)
		expect(hookFn).toHaveBeenCalledWith(
			expect.objectContaining({
				editor,
				operation: 'copy',
				source: 'menu',
				content: expect.objectContaining({
					shapes: expect.arrayContaining([expect.objectContaining({ id: ids.box1 })]),
				}),
			})
		)
	})

	it('uses modified content when hook returns a new object', async () => {
		doMockClipboard()
		editor = new TestEditor({
			options: {
				onBeforeCopyToClipboard: ({ content }) => ({
					...content,
					shapes: content.shapes.filter((s) => s.id === ids.box1),
					rootShapeIds: [ids.box1],
				}),
			},
		})
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])
		editor.selectAll()

		await handleNativeOrMenuCopy(editor)
		expect(window.navigator.clipboard.write).toHaveBeenCalled()
	})

	it('writes empty text when nothing is selected', async () => {
		doMockClipboard()
		editor = new TestEditor()
		await handleNativeOrMenuCopy(editor)
		expect(window.navigator.clipboard.write).not.toHaveBeenCalled()
	})
})
