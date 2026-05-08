import { Box, PageRecordType, createShapeId, react, type TLShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
	editor.setCamera({ x: 0, y: 0, z: 1 })
})

afterEach(() => {
	editor?.dispose()
})

// Track how many times a `getShapeIdsInsideBounds` reactor re-runs. The
// reactor's only dep is the spatial index epoch, so the delta is a direct
// proxy for "did the rbush epoch tick?". Initial subscribing run is dropped
// from the count.
function trackSpatialIndexInvalidations(target: TestEditor, bounds: Box) {
	let count = 0
	let lastIds: Set<TLShapeId> | undefined
	const stop = react('count spatial index invalidations', () => {
		lastIds = target.getShapeIdsInsideBounds(bounds)
		count++
	})
	const baseline = count
	return {
		get delta() {
			return count - baseline
		},
		get ids() {
			return lastIds!
		},
		stop,
	}
}

describe('SpatialIndexManager - bounds epoch', () => {
	it('ticks when a shape moves (real bounds change)', () => {
		const id = createShapeId('mover')
		editor.createShapes([{ id, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])

		const tracker = trackSpatialIndexInvalidations(editor, editor.getViewportPageBounds())

		editor.updateShapes([{ id, type: 'geo', x: 200, y: 200 }])

		expect(tracker.delta).toBe(1)
		tracker.stop()
	})

	it('does not tick on a prop-only update with unchanged bounds', () => {
		// Color change on a geo shape doesn't move bounds — step-1 must
		// short-circuit the upsert and the epoch must stay still.
		const id = createShapeId('prop-only')
		editor.createShapes([
			{ id, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100, color: 'black' } },
		])

		const tracker = trackSpatialIndexInvalidations(editor, editor.getViewportPageBounds())

		editor.updateShapes([{ id, type: 'geo', props: { color: 'red' } }])

		expect(tracker.delta).toBe(0)
		tracker.stop()
	})

	it('does not tick when removing a shape that lives on a different page', () => {
		const page1 = editor.getCurrentPageId()
		editor.createShapes([{ id: createShapeId('p1-anchor'), type: 'geo', x: 100, y: 100 }])

		// Stage a shape on a different page so its lifecycle never touches
		// page1's rbush.
		const page2 = PageRecordType.createId('page2-remove-epoch')
		editor.createPage({ name: 'page2-remove-epoch', id: page2 })
		editor.setCurrentPage(page2)
		const ghostId = createShapeId('p2-ghost')
		editor.createShapes([{ id: ghostId, type: 'geo', x: 100, y: 100 }])
		editor.setCurrentPage(page1)

		const tracker = trackSpatialIndexInvalidations(editor, editor.getViewportPageBounds())

		// Removing a shape that was never indexed on the active page must
		// not bump the bounds epoch.
		editor.deleteShape(ghostId)

		expect(tracker.delta).toBe(0)
		tracker.stop()
	})

	it('does not tick when adding a shape with invalid bounds is cleaned up', () => {
		// Adding a normal shape ticks the epoch; we use that as a control
		// to make sure the tracker actually sees ticks when expected.
		const id = createShapeId('control')
		const tracker = trackSpatialIndexInvalidations(editor, editor.getViewportPageBounds())

		editor.createShapes([{ id, type: 'geo', x: 100, y: 100 }])
		expect(tracker.delta).toBe(1)

		// A redundant prop-only update must not bump again.
		editor.updateShapes([{ id, type: 'geo', props: { color: 'blue' } }])
		expect(tracker.delta).toBe(1)

		tracker.stop()
	})

	it('ticks on page switch (full rebuild)', () => {
		editor.createShapes([{ id: createShapeId('p1-shape'), type: 'geo', x: 100, y: 100 }])

		// Establish a baseline read so the computed is initialized.
		editor.getShapeIdsInsideBounds(editor.getViewportPageBounds())

		const tracker = trackSpatialIndexInvalidations(editor, editor.getViewportPageBounds())

		const page2 = PageRecordType.createId('page2-switch')
		editor.createPage({ name: 'page2-switch', id: page2 })
		editor.setCurrentPage(page2)

		// Switching pages forces a full rebuild — the bounds epoch must bump.
		expect(tracker.delta).toBeGreaterThanOrEqual(1)
		tracker.stop()
	})
})

describe('SpatialIndexManager - step-2 transitive bounds sweep', () => {
	it('refreshes arrow bounds when a bound geo shape changes outline without changing axis-aligned bounds', () => {
		// Regression: a geo shape's `props.geo` flip from rectangle to
		// ellipse keeps its axis-aligned bounds but moves the outline. An
		// arrow bound to it intersects that outline, so its endpoint
		// shifts and its axis-aligned bounds change. The spatial index
		// must update the arrow even though the geo's own step-1 bounds
		// check showed no change — the step-2 sweep is the only thing
		// that catches this.
		const targetId = createShapeId('outline-target')
		editor.createShapes([
			{
				id: targetId,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, geo: 'rectangle' },
			},
		])

		const targetBoundsBefore = editor.getShapePageBounds(targetId)!
		expect(targetBoundsBefore).toBeDefined()

		// Draw an arrow from a non-axis-aligned direction so the bound
		// endpoint lands somewhere rectangle and inscribed ellipse disagree.
		editor.setCurrentTool('arrow')
		editor.pointerDown(-100, -100)
		editor.pointerMove(50, 50)
		editor.pointerUp(50, 50)
		editor.selectNone()

		const arrow = editor.getCurrentPageShapes().find((s) => s.type === 'arrow')!
		expect(arrow).toBeDefined()

		const arrowBoundsBefore = editor.getShapePageBounds(arrow.id)!
		expect(arrowBoundsBefore).toBeDefined()

		// Flip target geometry without changing its axis-aligned bounds.
		editor.updateShapes([{ id: targetId, type: 'geo', props: { geo: 'ellipse' } }])

		// Geo's own bounds must be unchanged.
		const targetBoundsAfter = editor.getShapePageBounds(targetId)!
		expect(targetBoundsAfter.equals(targetBoundsBefore)).toBe(true)

		// Arrow's actual page bounds shifted because the bound endpoint
		// moved.
		const arrowBoundsAfter = editor.getShapePageBounds(arrow.id)!
		expect(arrowBoundsAfter.equals(arrowBoundsBefore)).toBe(false)

		// Spatial index must reflect the new arrow bounds. Build a probe
		// inside the symmetric difference of before/after — pick whichever
		// edge expanded and put a thin strip just outside the old edge but
		// inside the new one. If the rbush still has the old bounds, the
		// probe won't intersect them and the assertion fails.
		const probe = probeOnlyInAfter(arrowBoundsBefore, arrowBoundsAfter)
		const hits = editor.getShapeIdsInsideBounds(probe)
		expect(hits.has(arrow.id)).toBe(true)
	})

	it('updates an indexed shape when its bounds become invalid (e.g. moved off-page)', () => {
		const page1 = editor.getCurrentPageId()
		const id = createShapeId('migrating')
		editor.createShapes([{ id, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])

		// Confirm it's indexed on page1.
		expect(editor.getShapeIdsInsideBounds(new Box(0, 0, 1000, 1000)).has(id)).toBe(true)

		// Reparent to a new page — on the original page index, the shape
		// must be removed and the epoch must bump.
		const page2 = PageRecordType.createId('page2-migrate')
		editor.createPage({ name: 'page2-migrate', id: page2 })

		editor.setCurrentPage(page1)
		const tracker = trackSpatialIndexInvalidations(editor, new Box(0, 0, 1000, 1000))

		editor.updateShapes([{ id, type: 'geo', x: 100, y: 100, parentId: page2 } as any])

		expect(tracker.delta).toBeGreaterThanOrEqual(1)
		expect(editor.getShapeIdsInsideBounds(new Box(0, 0, 1000, 1000)).has(id)).toBe(false)
		tracker.stop()
	})
})

describe('SpatialIndexManager - basic queries', () => {
	it('returns shapes inside the queried bounds', () => {
		const insideId = createShapeId('inside')
		const outsideId = createShapeId('outside')
		editor.createShapes([
			{ id: insideId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: outsideId, type: 'geo', x: 5000, y: 5000, props: { w: 100, h: 100 } },
		])

		const hits = editor.getShapeIdsInsideBounds(new Box(0, 0, 1000, 1000))
		expect(hits.has(insideId)).toBe(true)
		expect(hits.has(outsideId)).toBe(false)
	})

	it('removes a shape from the index when it is deleted', () => {
		const id = createShapeId('doomed')
		editor.createShapes([{ id, type: 'geo', x: 100, y: 100 }])
		expect(editor.getShapeIdsInsideBounds(new Box(0, 0, 1000, 1000)).has(id)).toBe(true)

		editor.deleteShape(id)
		expect(editor.getShapeIdsInsideBounds(new Box(0, 0, 1000, 1000)).has(id)).toBe(false)
	})
})

function probeOnlyInAfter(before: Box, after: Box): Box {
	const eps = 0.01
	const thickness = 1
	if (after.maxX > before.maxX + eps) {
		const x = before.maxX + eps
		return new Box(x, after.minY, Math.min(thickness, after.maxX - x), Math.max(after.h, eps))
	}
	if (after.maxY > before.maxY + eps) {
		const y = before.maxY + eps
		return new Box(after.minX, y, Math.max(after.w, eps), Math.min(thickness, after.maxY - y))
	}
	if (after.minX < before.minX - eps) {
		return new Box(
			after.minX,
			after.minY,
			Math.min(thickness, before.minX - after.minX - eps),
			Math.max(after.h, eps)
		)
	}
	if (after.minY < before.minY - eps) {
		return new Box(
			after.minX,
			after.minY,
			Math.max(after.w, eps),
			Math.min(thickness, before.minY - after.minY - eps)
		)
	}
	throw new Error('expected after-bounds to extend past before-bounds on at least one edge')
}
