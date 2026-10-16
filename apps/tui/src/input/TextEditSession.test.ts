import { createShapeId, type TLFrameShape, type TLGeoShape, type TLShape } from '@tldraw/editor'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getShapePlaintext } from '../editor/richText'
import { codeForKey, type KeyEvent } from '../terminal/InputParser'
import { createTestContext, type TestContext } from '../test/testContext'
import { TextEditSession, insertableText } from './TextEditSession'

function key(k: string, opts: Partial<Omit<KeyEvent, 'type' | 'key'>> = {}): KeyEvent {
	return {
		type: 'key',
		key: k,
		code: codeForKey(k),
		shift: false,
		ctrl: false,
		alt: false,
		meta: false,
		...opts,
	}
}

function type(session: TextEditSession, text: string) {
	for (const ch of text) session.handleKey(key(ch === '\n' ? 'Enter' : ch))
}

describe('TextEditSession', () => {
	let ctx: TestContext
	let geo: TLShape

	beforeEach(() => {
		ctx = createTestContext()
		const id = createShapeId()
		ctx.editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, props: { w: 200, h: 100 } })
		geo = ctx.editor.getShape(id)!
	})

	afterEach(() => ctx.dispose())

	it('starts from the shape text with the caret at the end and publishes the caret', () => {
		const session = new TextEditSession(ctx, geo)
		expect(session.getText()).toBe('')
		expect(session.getCaret()).toBe(0)
		expect(ctx.ui.editCaret.get()).toEqual({ shapeId: geo.id, caret: 0 })
		session.end()
		expect(ctx.ui.editCaret.get()).toBeNull()
	})

	it('writes typed text back as rich text', () => {
		const session = new TextEditSession(ctx, geo)
		type(session, 'héllo')
		expect(session.getText()).toBe('héllo')
		expect(getShapePlaintext(ctx.editor, ctx.editor.getShape(geo.id)!)).toBe('héllo')
		expect(ctx.ui.editCaret.get()).toEqual({ shapeId: geo.id, caret: 5 })

		session.handleKey(key('Enter'))
		type(session, 'world')
		expect(getShapePlaintext(ctx.editor, ctx.editor.getShape(geo.id)!)).toBe('héllo\nworld')
		const richText = (ctx.editor.getShape(geo.id) as TLGeoShape).props.richText
		expect(richText.content).toHaveLength(2)
	})

	it('treats grapheme clusters as single cells', () => {
		const session = new TextEditSession(ctx, geo)
		session.insert('a👍🏽b')
		expect(session.getCaret()).toBe(3)
		session.handleKey(key('ArrowLeft'))
		session.handleKey(key('Backspace'))
		expect(session.getText()).toBe('ab')
		expect(session.getCaret()).toBe(1)
		session.handleKey(key('Delete'))
		expect(session.getText()).toBe('a')
	})

	it('moves the caret with arrows, Home and End across lines', () => {
		const session = new TextEditSession(ctx, geo)
		session.insert('abc\ndefgh\nij')
		expect(session.getCaret()).toBe(12)
		session.handleKey(key('ArrowUp'))
		expect(session.getCaret()).toBe(6) // column 2 of "defgh"
		session.handleKey(key('End'))
		expect(session.getCaret()).toBe(9)
		session.handleKey(key('ArrowUp'))
		expect(session.getCaret()).toBe(3) // clamped to the end of "abc"
		session.handleKey(key('Home'))
		expect(session.getCaret()).toBe(0)
		session.handleKey(key('ArrowDown'))
		expect(session.getCaret()).toBe(4)
		session.handleKey(key('ArrowRight'))
		session.insert('X')
		expect(session.getText()).toBe('abc\ndXefgh\nij')
		session.handleKey(key('End', { ctrl: true }))
		expect(session.getCaret()).toBe(13)
		session.handleKey(key('Home', { ctrl: true }))
		expect(session.getCaret()).toBe(0)
	})

	it('deletes a word with ctrl+Backspace', () => {
		const session = new TextEditSession(ctx, geo)
		session.insert('one two  ')
		session.handleKey(key('Backspace', { ctrl: true }))
		expect(session.getText()).toBe('one ')
	})

	it('finishes on Escape, alt+Enter and ctrl+Enter', () => {
		const session = new TextEditSession(ctx, geo)
		expect(session.handleKey(key('Escape'))).toBe('complete')
		expect(session.handleKey(key('Enter', { alt: true }))).toBe('complete')
		expect(session.handleKey(key('Enter', { ctrl: true }))).toBe('complete')
		expect(session.handleKey(key('Enter'))).toBe('consumed')
		expect(session.handleKey(key('Tab'))).toBe('consumed')
		expect(session.handleKey(key('F5'))).toBe('consumed')
		expect(session.handleKey(key('z', { ctrl: true }))).toBe('consumed')
		expect(session.getText()).toBe('\n')
	})

	it('edits a frame name', () => {
		const id = createShapeId()
		ctx.editor.createShape<TLFrameShape>({
			id,
			type: 'frame',
			x: 0,
			y: 0,
			props: { w: 300, h: 200, name: 'Plan' },
		})
		const session = new TextEditSession(ctx, ctx.editor.getShape(id)!)
		expect(session.getText()).toBe('Plan')
		session.handleKey(key('Backspace'))
		session.insert('nning')
		expect((ctx.editor.getShape(id) as TLFrameShape).props.name).toBe('Planning')
	})
})

describe('insertableText', () => {
	it('accepts printable keys and the parser text field only', () => {
		expect(insertableText(key('a'))).toBe('a')
		expect(insertableText(key(' '))).toBe(' ')
		expect(insertableText(key('é'))).toBe('é')
		expect(insertableText(key('😀'))).toBe('😀')
		expect(insertableText(key('a', { text: 'å' }))).toBe('å')
		expect(insertableText(key('a', { ctrl: true }))).toBeNull()
		expect(insertableText(key('a', { alt: true }))).toBeNull()
		expect(insertableText(key('F1'))).toBeNull()
		expect(insertableText(key('Home'))).toBeNull()
		expect(insertableText(key('\u0007'))).toBeNull()
	})
})
