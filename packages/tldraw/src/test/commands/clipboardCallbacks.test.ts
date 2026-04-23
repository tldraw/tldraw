import { TLExternalContent, createShapeId, defaultTldrawOptions } from '@tldraw/editor'
import { vi } from 'vitest'
import {
	handleNativeOrMenuCopy,
	putPastedExternalContent,
	resolvePasteModifiers,
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

describe('defaultTldrawOptions', () => {
	it('declares the clipboard callback defaults explicitly', () => {
		expect(defaultTldrawOptions).toHaveProperty('onBeforeCopyToClipboard', undefined)
		expect(defaultTldrawOptions).toHaveProperty('onBeforePasteFromClipboard', undefined)
		expect(defaultTldrawOptions).toHaveProperty('onClipboardPasteRaw', undefined)
	})
})

describe('putPastedExternalContent', () => {
	it('calls putExternalContent when no hook is set', async () => {
		editor = new TestEditor()
		const spy = vi.spyOn(editor, 'putExternalContent').mockResolvedValue()
		const content: TLExternalContent<unknown> = {
			type: 'text',
			text: 'hello',
		}
		await putPastedExternalContent(editor, content, { source: 'native-event' })
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
		await putPastedExternalContent(editor, content, { source: 'native-event' })
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
		await putPastedExternalContent(editor, content, { source: 'native-event' })
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
		await putPastedExternalContent(
			editor,
			{ type: 'text', text: 'original' },
			{ source: 'native-event' }
		)
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
		await putPastedExternalContent(editor, content, { source: 'native-event' })
		expect(hookFn).toHaveBeenCalledWith({
			editor,
			content,
			source: 'native-event',
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

	it('does not write to clipboard when hook returns false via Promise', async () => {
		doMockClipboard()
		editor = new TestEditor({
			options: { onBeforeCopyToClipboard: async (): Promise<false> => false },
		})
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
		editor.selectAll()
		const didCopy = await handleNativeOrMenuCopy(editor)
		expect(didCopy).toBe(false)
		expect(window.navigator.clipboard.write).not.toHaveBeenCalled()
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

	it('passes through explicit copy context', async () => {
		doMockClipboard()
		const hookFn = vi.fn(() => undefined)
		editor = new TestEditor({
			options: { onBeforeCopyToClipboard: hookFn },
		})
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
		editor.selectAll()
		await handleNativeOrMenuCopy(editor, { operation: 'cut', source: 'native' })
		expect(hookFn).toHaveBeenCalledWith(
			expect.objectContaining({
				operation: 'cut',
				source: 'native',
			})
		)
	})

	it('uses modified content when hook returns a new object via Promise', async () => {
		doMockClipboard()
		editor = new TestEditor({
			options: {
				onBeforeCopyToClipboard: async ({ content }) => ({
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

describe('resolvePasteModifiers', () => {
	it('cmd+v: regular paste, default position (pref off)', () => {
		const result = resolvePasteModifiers(false, false, false)
		expect(result).toEqual({ isPlainText: false, pasteAtCursor: false })
	})

	it('cmd+v: regular paste, default position (pref on)', () => {
		const result = resolvePasteModifiers(false, false, true)
		expect(result).toEqual({ isPlainText: false, pasteAtCursor: true })
	})

	it('cmd+shift+v: plain text, default position (pref off)', () => {
		const result = resolvePasteModifiers(true, false, false)
		expect(result).toEqual({ isPlainText: true, pasteAtCursor: false })
	})

	it('cmd+shift+v: plain text, default position (pref on)', () => {
		const result = resolvePasteModifiers(true, false, true)
		expect(result).toEqual({ isPlainText: true, pasteAtCursor: true })
	})

	it('cmd+option+v: regular paste, inverted position (pref off → cursor)', () => {
		const result = resolvePasteModifiers(false, true, false)
		expect(result).toEqual({ isPlainText: false, pasteAtCursor: true })
	})

	it('cmd+option+v: regular paste, inverted position (pref on → center)', () => {
		const result = resolvePasteModifiers(false, true, true)
		expect(result).toEqual({ isPlainText: false, pasteAtCursor: false })
	})

	it('cmd+shift+option+v: plain text, inverted position (pref off → cursor)', () => {
		const result = resolvePasteModifiers(true, true, false)
		expect(result).toEqual({ isPlainText: true, pasteAtCursor: true })
	})

	it('cmd+shift+option+v: plain text, inverted position (pref on → center)', () => {
		const result = resolvePasteModifiers(true, true, true)
		expect(result).toEqual({ isPlainText: true, pasteAtCursor: false })
	})
})

describe('editor modifier delay vs native modifier state', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		editor = new TestEditor()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('editor getShiftKey stays true for 150ms after shift is released (demonstrating the delay)', () => {
		// Press shift
		editor.dispatch({
			type: 'keyboard',
			name: 'key_down',
			key: 'Shift',
			shiftKey: true,
			ctrlKey: false,
			altKey: false,
			metaKey: false,
			accelKey: false,
			code: 'ShiftLeft',
		})
		editor.forceTick()
		expect(editor.inputs.getShiftKey()).toBe(true)

		// Release shift
		editor.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: 'Shift',
			shiftKey: false,
			ctrlKey: false,
			altKey: false,
			metaKey: false,
			accelKey: false,
			code: 'ShiftLeft',
		})
		editor.forceTick()

		// Editor still thinks shift is held due to 150ms delay
		expect(editor.inputs.getShiftKey()).toBe(true)

		// A native keydown event would report shiftKey=false immediately.
		// This is the race condition: if cmd+v fires within this 150ms window,
		// using editor.inputs.getShiftKey() would incorrectly return true,
		// causing a plain text paste when the user wanted a regular paste.

		// After 150ms, the editor finally catches up
		vi.advanceTimersByTime(150)
		expect(editor.inputs.getShiftKey()).toBe(false)
	})
})
