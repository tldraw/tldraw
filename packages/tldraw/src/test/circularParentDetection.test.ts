import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	frameA: createShapeId('frameA'),
	frameB: createShapeId('frameB'),
	frameC: createShapeId('frameC'),
	box1: createShapeId('box1'),
	// Additional IDs for 3-way cycle test to avoid conflicts with beforeEach shapes
	threeWayA: createShapeId('threeWayA'),
	threeWayB: createShapeId('threeWayB'),
	threeWayC: createShapeId('threeWayC'),
}

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe('Circular parent detection', () => {
	describe('reparentShapes cycle prevention', () => {
		it('prevents reparenting a shape to its own descendant', () => {
			// Create a parent-child relationship: frameA -> frameB
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{
					type: 'frame',
					id: ids.frameB,
					x: 50,
					y: 50,
					parentId: ids.frameA,
					props: { w: 100, h: 100 },
				},
			])

			// Verify initial hierarchy
			expect(editor.getShape(ids.frameB)?.parentId).toBe(ids.frameA)

			// Try to reparent frameA into frameB (would create cycle: frameA -> frameB -> frameA)
			// This should be silently rejected
			editor.reparentShapes([ids.frameA], ids.frameB)

			// frameA should NOT have been reparented to frameB (cycle prevention)
			expect(editor.getShape(ids.frameA)?.parentId).not.toBe(ids.frameB)
		})

		it('prevents reparenting a shape to its indirect descendant', () => {
			// Create a chain: frameA -> frameB -> frameC
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 300, h: 300 } },
				{
					type: 'frame',
					id: ids.frameB,
					x: 50,
					y: 50,
					parentId: ids.frameA,
					props: { w: 200, h: 200 },
				},
				{
					type: 'frame',
					id: ids.frameC,
					x: 75,
					y: 75,
					parentId: ids.frameB,
					props: { w: 100, h: 100 },
				},
			])

			// Verify initial hierarchy
			expect(editor.getShape(ids.frameB)?.parentId).toBe(ids.frameA)
			expect(editor.getShape(ids.frameC)?.parentId).toBe(ids.frameB)

			// Try to reparent frameA into frameC (would create cycle: frameA -> frameB -> frameC -> frameA)
			editor.reparentShapes([ids.frameA], ids.frameC)

			// frameA should NOT have been reparented to frameC
			expect(editor.getShape(ids.frameA)?.parentId).not.toBe(ids.frameC)
		})

		it('allows valid reparenting operations', () => {
			// Create two independent frames
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{ type: 'frame', id: ids.frameB, x: 300, y: 0, props: { w: 200, h: 200 } },
			])

			// Reparent frameB into frameA (valid operation, no cycle)
			editor.reparentShapes([ids.frameB], ids.frameA)

			// This should succeed
			expect(editor.getShape(ids.frameB)?.parentId).toBe(ids.frameA)
		})
	})

	describe('beforeChange handler cycle repair', () => {
		it('repairs cycles by keeping the original parent', () => {
			// Create a simple hierarchy: frameA -> frameB
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{
					type: 'frame',
					id: ids.frameB,
					x: 50,
					y: 50,
					parentId: ids.frameA,
					props: { w: 100, h: 100 },
				},
			])

			// Save the original parentId before the cyclic update
			const originalParentId = editor.getShape(ids.frameA)?.parentId

			// Directly update the store to create a cycle (simulates remote sync)
			editor.updateShapes([{ id: ids.frameA, type: 'frame', parentId: ids.frameB }])

			// The cycle should have been repaired by keeping the original parent
			const frameAAfter = editor.getShape(ids.frameA)
			expect(frameAAfter?.parentId).not.toBe(ids.frameB)
			expect(frameAAfter?.parentId).toBe(originalParentId)
		})

		it('prevents setting a shape parentId to itself', () => {
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
			])

			const originalParentId = editor.getShape(ids.frameA)?.parentId

			// Attempt to set frameA's parentId to itself
			editor.updateShapes([{ id: ids.frameA, type: 'frame', parentId: ids.frameA }])

			const frameAAfter = editor.getShape(ids.frameA)
			expect(frameAAfter?.parentId).toBe(originalParentId)
		})

		it('prevents 3-way cycles from concurrent reparenting operations', () => {
			// Create three independent frames
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{ type: 'frame', id: ids.frameB, x: 300, y: 0, props: { w: 200, h: 200 } },
				{ type: 'frame', id: ids.frameC, x: 600, y: 0, props: { w: 200, h: 200 } },
			])

			// Simulate concurrent sync: A→B, B→C, C→A
			// These are processed sequentially by the store
			editor.updateShapes([{ id: ids.frameA, type: 'frame', parentId: ids.frameB }])
			editor.updateShapes([{ id: ids.frameB, type: 'frame', parentId: ids.frameC }])
			// This one should be blocked - would create A→B→C→A cycle
			editor.updateShapes([{ id: ids.frameC, type: 'frame', parentId: ids.frameA }])

			// Verify no cycle exists - C should NOT be a child of A
			const frameC = editor.getShape(ids.frameC)
			expect(frameC?.parentId).not.toBe(ids.frameA)

			// But A→B and B→C should have succeeded
			expect(editor.getShape(ids.frameA)?.parentId).toBe(ids.frameB)
			expect(editor.getShape(ids.frameB)?.parentId).toBe(ids.frameC)
		})
	})

	describe('traversal methods are cycle-safe', () => {
		beforeEach(() => {
			// Create shapes and then manually create a cycle for testing
			// Note: In real scenarios, cycles are created via remote sync. Here we test
			// the safety of traversal methods themselves.
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{
					type: 'frame',
					id: ids.frameB,
					x: 50,
					y: 50,
					parentId: ids.frameA,
					props: { w: 100, h: 100 },
				},
			])
		})

		// Helper to force a cycle into the store by temporarily disabling side effects
		function forceCycleIntoStore() {
			editor.store.sideEffects.setIsEnabled(false)
			try {
				editor.updateShapes([{ id: ids.frameA, type: 'frame', parentId: ids.frameB }])
			} finally {
				editor.store.sideEffects.setIsEnabled(true)
			}
		}

		// Test all traversal methods handle cycles without stack overflow
		it.each([
			['getShapeAncestors', () => editor.getShapeAncestors(ids.frameA)],
			['hasAncestor', () => editor.hasAncestor(ids.frameA, ids.box1)],
			['findShapeAncestor', () => editor.findShapeAncestor(ids.frameA, () => false)],
			['isShapeOrAncestorLocked', () => editor.isShapeOrAncestorLocked(ids.frameA)],
			['getAncestorPageId', () => editor.getAncestorPageId(ids.frameA)],
			['isShapeInPage', () => editor.isShapeInPage(ids.frameA)],
			['visitDescendants', () => editor.visitDescendants(ids.frameA, () => {})],
			['findCommonAncestor', () => editor.findCommonAncestor([ids.frameA, ids.frameB])],
			['getOutermostSelectableShape', () => editor.getOutermostSelectableShape(ids.frameA)],
			['getShapePageTransform', () => editor.getShapePageTransform(ids.frameA)],
		])('%s handles cycles without stack overflow', (_methodName, method) => {
			forceCycleIntoStore()
			expect(method).not.toThrow()
		})

		it('handles forced 3-way cycles without stack overflow', () => {
			// Create three frames using dedicated IDs to avoid conflicts with beforeEach shapes
			editor.createShapes([
				{ type: 'frame', id: ids.threeWayA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{ type: 'frame', id: ids.threeWayB, x: 300, y: 0, props: { w: 200, h: 200 } },
				{ type: 'frame', id: ids.threeWayC, x: 600, y: 0, props: { w: 200, h: 200 } },
			])

			// Disable side effects to force a 3-way cycle into the store
			editor.store.sideEffects.setIsEnabled(false)
			try {
				editor.updateShapes([
					{ id: ids.threeWayA, type: 'frame', parentId: ids.threeWayB },
					{ id: ids.threeWayB, type: 'frame', parentId: ids.threeWayC },
					{ id: ids.threeWayC, type: 'frame', parentId: ids.threeWayA },
				])
			} finally {
				editor.store.sideEffects.setIsEnabled(true)
			}

			// All traversal methods should handle this without crashing
			expect(() => editor.getShapeAncestors(ids.threeWayA)).not.toThrow()
			expect(() => editor.getShapeAncestors(ids.threeWayB)).not.toThrow()
			expect(() => editor.getShapeAncestors(ids.threeWayC)).not.toThrow()
			expect(() => editor.hasAncestor(ids.threeWayA, ids.threeWayB)).not.toThrow()
			expect(() => editor.hasAncestor(ids.threeWayB, ids.threeWayC)).not.toThrow()
			expect(() => editor.hasAncestor(ids.threeWayC, ids.threeWayA)).not.toThrow()
			expect(() => editor.getShapePageTransform(ids.threeWayA)).not.toThrow()
			expect(() => editor.getAncestorPageId(ids.threeWayA)).not.toThrow()
			expect(() => editor.visitDescendants(ids.threeWayA, () => {})).not.toThrow()
			expect(() =>
				editor.findCommonAncestor([ids.threeWayA, ids.threeWayB, ids.threeWayC])
			).not.toThrow()
		})
	})

	describe('Undo/redo behavior with cycle prevention', () => {
		it('undo/redo works correctly when a valid reparent is performed', () => {
			// Create two independent frames
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{ type: 'frame', id: ids.frameB, x: 300, y: 0, props: { w: 200, h: 200 } },
			])

			const pageId = editor.getCurrentPageId()

			// Mark history so the reparent is a separate undo entry
			editor.markHistoryStoppingPoint()

			// Reparent frameB into frameA (valid operation)
			editor.reparentShapes([ids.frameB], ids.frameA)
			expect(editor.getShape(ids.frameB)?.parentId).toBe(ids.frameA)

			// Undo should restore frameB to the page
			editor.undo()
			expect(editor.getShape(ids.frameB)?.parentId).toBe(pageId)

			// Redo should reparent frameB back into frameA
			editor.redo()
			expect(editor.getShape(ids.frameB)?.parentId).toBe(ids.frameA)
		})

		it('undo stack remains clean when cycle prevention blocks a change', () => {
			// Create a parent-child relationship: frameA -> frameB
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{
					type: 'frame',
					id: ids.frameB,
					x: 50,
					y: 50,
					parentId: ids.frameA,
					props: { w: 100, h: 100 },
				},
			])

			const pageId = editor.getCurrentPageId()

			// Try to reparent frameA into frameB (would create cycle)
			// This should be blocked by cycle prevention
			editor.reparentShapes([ids.frameA], ids.frameB)

			// frameA should still be at page level
			expect(editor.getShape(ids.frameA)?.parentId).toBe(pageId)

			// Since the cycle was prevented and nothing changed,
			// undo should take us back to before the createShapes
			editor.undo()

			// After undo, the shapes should no longer exist
			// (we undid the createShapes call, not a no-op reparent)
			expect(editor.getShape(ids.frameA)).toBeUndefined()
			expect(editor.getShape(ids.frameB)).toBeUndefined()
		})

		it('partial batch: valid changes are undone even when some changes were blocked', () => {
			// Create three frames: A -> B, and C independent
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{
					type: 'frame',
					id: ids.frameB,
					x: 50,
					y: 50,
					parentId: ids.frameA,
					props: { w: 100, h: 100 },
				},
				{ type: 'frame', id: ids.frameC, x: 300, y: 0, props: { w: 200, h: 200 } },
			])

			const pageId = editor.getCurrentPageId()

			// Mark history so the reparent batch is a separate undo entry
			editor.markHistoryStoppingPoint()

			// Try to reparent both frameA (into frameB - blocked) and frameC (into frameA - valid)
			// Only the valid operation should succeed
			editor.run(() => {
				editor.reparentShapes([ids.frameA], ids.frameB) // blocked
				editor.reparentShapes([ids.frameC], ids.frameA) // valid
			})

			// frameA should still be at page level (cycle blocked)
			expect(editor.getShape(ids.frameA)?.parentId).toBe(pageId)
			// frameC should now be under frameA (valid operation succeeded)
			expect(editor.getShape(ids.frameC)?.parentId).toBe(ids.frameA)

			// Undo the batch - should undo the valid frameC reparent
			editor.undo()

			// frameC should be back at page level
			expect(editor.getShape(ids.frameC)?.parentId).toBe(pageId)
		})
	})

	describe('Multiplayer sync scenario simulation', () => {
		it('handles the issue repro scenario: two frames reparented into each other', () => {
			// Create two independent frames (simulating initial state)
			editor.createShapes([
				{ type: 'frame', id: ids.frameA, x: 0, y: 0, props: { w: 200, h: 200 } },
				{ type: 'frame', id: ids.frameB, x: 300, y: 0, props: { w: 200, h: 200 } },
			])

			// Simulate what happens when two clients make conflicting reparenting operations:
			// Client 1 drags frameA into frameB while Client 2 drags frameB into frameA
			// After sync, both updates arrive and are applied

			// Disable side effects to simulate raw sync updates
			editor.store.sideEffects.setIsEnabled(false)
			try {
				// These updates would create a cycle: frameA -> frameB -> frameA
				editor.updateShapes([{ id: ids.frameA, type: 'frame', parentId: ids.frameB }])
				editor.updateShapes([{ id: ids.frameB, type: 'frame', parentId: ids.frameA }])
			} finally {
				editor.store.sideEffects.setIsEnabled(true)
			}

			// After this point, we have a cycle in the data.
			// The key test is: does the editor crash when we try to use it?

			// These operations should not throw stack overflow errors
			expect(() => {
				editor.visitDescendants(ids.frameA, () => {})
			}).not.toThrow()

			expect(() => {
				editor.getShapeAncestors(ids.frameA)
			}).not.toThrow()

			expect(() => {
				editor.getShapePageTransform(ids.frameA)
			}).not.toThrow()

			expect(() => {
				editor.isShapeInPage(ids.frameA)
			}).not.toThrow()
		})
	})
})
