import type { TLShapeId } from '@tldraw/tlschema'
import { getCulledShapeIds } from './culling'

// Culling out-of-view and selected shapes is covered through the editor in
// packages/tldraw/src/test/getCulledShapes.test.tsx. These cover the editing shape and set identity.

const id = (name: string) => `shape:${name}` as TLShapeId
const a = id('a')
const b = id('b')

describe('getCulledShapeIds', () => {
	it('does not cull the shape being edited', () => {
		expect(getCulledShapeIds(new Set([a, b]), [], a, null)).toEqual(new Set([b]))
	})

	it('leaves the source set alone', () => {
		const notVisible = new Set([a, b])
		getCulledShapeIds(notVisible, [a], null, null)
		expect(notVisible).toEqual(new Set([a, b]))
	})

	it('keeps the previous set when the result is unchanged', () => {
		const previous = new Set([b])
		expect(getCulledShapeIds(new Set([a, b]), [a], null, previous)).toBe(previous)
	})
})
