import type { Editor } from 'tldraw'
import { describe, expect, it } from 'vitest'
import type { MethodMap } from '../../shared/generated-data'
import { createFocusedEditorProxy } from './focused-editor-proxy'

// A tiny method map exercising both return paths: a value getter that must pass
// its result through untouched, and a chainable method that returns the editor.
const methodMap = {
	getShapePageBounds: { args: ['id-or-shape'], ret: 'raw' },
	select: { args: ['spread-ids'], ret: 'this' },
} as unknown as MethodMap

function makeProxy() {
	const target: any = {}
	target.getShapePageBounds = (id: string) => ({ x: 1, y: 2, w: 3, h: 4, id })
	target.select = () => target
	return { proxy: createFocusedEditorProxy(target as Editor, methodMap), target }
}

describe('createFocusedEditorProxy', () => {
	it('passes value getters through untouched instead of returning the editor', () => {
		// Regression: getShapePageBounds (and 24 other value getters) were mislabeled
		// ret:'this' in the generated method map, so the proxy returned itself here.
		const { proxy } = makeProxy()
		const bounds = (proxy as any).getShapePageBounds('tri1')
		expect(bounds).toEqual({ x: 1, y: 2, w: 3, h: 4, id: 'shape:tri1' })
		expect(bounds).not.toBe(proxy)
	})

	it('does not throw when coerced to a string', () => {
		// Regression: methodMap is a plain object, so `methodMap['toString']` resolved
		// to the inherited Object.prototype.toString (a function with no `args`).
		// Coercing the proxy invoked it and read `spec.args.length` on undefined,
		// throwing "Cannot read properties of undefined (reading 'length')".
		const { proxy } = makeProxy()
		expect(() => String(proxy)).not.toThrow()
		expect(() => `${proxy}`).not.toThrow()
		expect(String(proxy)).toBe('[object Object]')
	})

	it('still returns the proxy for chainable methods', () => {
		const { proxy } = makeProxy()
		expect((proxy as any).select('a')).toBe(proxy)
	})
})
