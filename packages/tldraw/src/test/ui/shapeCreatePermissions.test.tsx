import { act, screen } from '@testing-library/react'
import { Editor, TLPermission, atom, createShapeId } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { TLUiToolsContextType, useTools } from '../../lib/ui/hooks/useTools'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const ALL: TLPermission[] = [
	'tl:shape:create',
	'tl:shape:update',
	'tl:shape:delete',
	'tl:page:create',
	'tl:page:update',
	'tl:page:delete',
]
const granted = atom<TLPermission[]>('granted', ALL)
const grant = (...permissions: TLPermission[]) => act(() => granted.set(permissions))
const without = (...permissions: TLPermission[]) => ALL.filter((p) => !permissions.includes(p))

let editor: Editor
let actions: TLUiActionsContextType
let tools: TLUiToolsContextType

function Capturer() {
	const a = useActions()
	const t = useTools()
	useEffect(() => {
		actions = a
		tools = t
	}, [a, t])
	return null
}

beforeEach(async () => {
	granted.set(ALL)
	const result = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} isPermitted={(permission) => granted.get().includes(permission)}>
				<Capturer />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	editor = result.editor
})

afterEach(() => {
	editor?.dispose()
})

const isDisabled = (testId: string) => screen.getByTestId<HTMLButtonElement>(testId).disabled

describe('toolbar tools', () => {
	const read = () => ({
		select: isDisabled('tools.select'),
		draw: isDisabled('tools.draw'),
		arrow: isDisabled('tools.arrow'),
		text: isDisabled('tools.text'),
		eraser: isDisabled('tools.eraser'),
	})
	const allOn = { select: false, draw: false, arrow: false, text: false, eraser: false }

	it('disables the drawing tools without tl:shape:create, and follows the grant', () => {
		expect(read()).toEqual(allOn)
		grant(...without('tl:shape:create'))
		expect(read()).toEqual({ ...allOn, draw: true, arrow: true, text: true })
		grant(...ALL)
		expect(read()).toEqual(allOn)
	})

	it('disables the drawing tools without tl:shape:update: drawing updates the shape it creates', () => {
		grant(...without('tl:shape:update'))
		expect(read()).toEqual({ ...allOn, draw: true, arrow: true, text: true })
	})

	it('disables the eraser without tl:shape:delete', () => {
		grant(...without('tl:shape:delete'))
		expect([isDisabled('tools.eraser'), isDisabled('tools.draw')]).toEqual([true, false])
	})

	it('does not switch to a disabled tool, from a shortcut or anywhere else', () => {
		grant(...without('tl:shape:create'))
		act(() => tools['draw'].onSelect('kbd'))
		expect(editor.getCurrentToolId()).toBe('select')
		grant(...ALL)
		act(() => tools['draw'].onSelect('kbd'))
		expect(editor.getCurrentToolId()).toBe('draw')
	})
})

describe('actions that create shapes', () => {
	it('are disabled without tl:shape:create, but not without tl:shape:update', () => {
		const id = createShapeId()
		act(() => {
			editor.createShapes([{ id, type: 'geo' }])
			editor.select(id)
		})
		const ids = ['duplicate', 'paste-at-cursor', 'insert-media', 'insert-embed', 'delete']
		const read = () =>
			Object.fromEntries(ids.map((id) => [id, actions[id].isEnabled?.(editor) ?? true]))
		const allOn = Object.fromEntries(ids.map((id) => [id, true]))
		expect(read()).toEqual(allOn)

		grant(...without('tl:shape:create'))
		expect(read()).toEqual({
			duplicate: false,
			'paste-at-cursor': false,
			'insert-media': false,
			'insert-embed': false,
			delete: true,
		})

		grant(...without('tl:shape:update'))
		expect(read()).toEqual(allOn)
	})

	it('leave editor methods alone: duplicateShapes still tries, and the write rule decides', () => {
		const id = createShapeId()
		act(() => editor.createShapes([{ id, type: 'geo' }]))
		grant(...without('tl:shape:create'))
		act(() => editor.duplicateShapes([id]))
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
	})
})

describe('canvas gestures that create shapes', () => {
	it('notes have no clone handles without tl:shape:create', () => {
		const id = createShapeId()
		act(() => editor.createShapes([{ id, type: 'note' }]))
		const handles = () => editor.getShapeHandles(id) ?? []
		expect(handles().length).toBeGreaterThan(0)
		grant(...without('tl:shape:create'))
		expect(handles()).toEqual([])
	})
})

describe('external content', () => {
	it('is not handled at all without tl:shape:create, so nothing is uploaded', async () => {
		const handler = vi.fn()
		editor.registerExternalContentHandler('text', handler)
		grant(...without('tl:shape:create'))
		await editor.putExternalContent({ type: 'text', text: 'hello' })
		expect(handler).not.toHaveBeenCalled()
		grant(...ALL)
		await editor.putExternalContent({ type: 'text', text: 'hello' })
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('replacing content needs tl:shape:update, so nothing is uploaded either', async () => {
		const handler = vi.fn()
		editor.registerExternalContentHandler('text', handler)
		grant(...without('tl:shape:update'))
		await editor.replaceExternalContent({ type: 'text', text: 'hello' } as any)
		expect(handler).not.toHaveBeenCalled()
	})
})
