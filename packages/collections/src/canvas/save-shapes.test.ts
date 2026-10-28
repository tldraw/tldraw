import { createShapeId, createTLSchema, PageRecordType, type TLShape } from '@tldraw/tlschema'
import type { TLContent } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { groupRootShapes } from './save-shapes'

const pageId = PageRecordType.createId('page')

function geo(name: string, x: number, y: number, index: string, parentId: string = pageId) {
	return {
		id: createShapeId(name),
		typeName: 'shape',
		type: 'geo',
		x,
		y,
		rotation: 0,
		index,
		parentId,
		isLocked: false,
		opacity: 1,
		props: {},
		meta: {},
	} as unknown as TLShape
}

function content(shapes: TLShape[], rootShapeIds: TLShape['id'][]): TLContent {
	return { shapes, rootShapeIds, bindings: [], assets: [], schema: createTLSchema().serialize() }
}

describe('groupRootShapes', () => {
	const a = geo('a', 100, 50, 'a1')
	const b = geo('b', 300, 200, 'a2')
	const child = geo('child', 10, 10, 'a1', b.id)
	const grouped = groupRootShapes(content([a, b, child], [a.id, b.id]), {
		x: 100,
		y: 50,
		w: 300,
		h: 250,
	})
	const group = grouped.shapes.find((shape) => shape.type === 'group')!
	const byId = (id: TLShape['id']) => grouped.shapes.find((shape) => shape.id === id)!

	it('makes a new group the only top-level shape, at the top left of the bounds', () => {
		expect(grouped.rootShapeIds).toEqual([group.id])
		expect({ x: group.x, y: group.y }).toEqual({ x: 100, y: 50 })
	})

	it('takes the topmost index and the parent of the shapes it groups', () => {
		expect(group.index).toBe('a2')
		expect(group.parentId).toBe(pageId)
	})

	it('moves the top-level shapes into the group without moving them on the page', () => {
		expect(byId(a.id)).toMatchObject({ parentId: group.id, x: 0, y: 0 })
		expect(byId(b.id)).toMatchObject({ parentId: group.id, x: 200, y: 150 })
	})

	it("leaves nested shapes in their parent's space", () => {
		expect(byId(child.id)).toEqual(child)
	})
})
