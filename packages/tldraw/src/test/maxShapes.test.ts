import { createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({
		options: { maxShapesPerPage: 5 }, // Set a low limit for testing
	})
})

describe('Maximum shapes behavior', () => {
	describe('when maximum shapes limit is reached', () => {
		beforeEach(() => {
			// Create shapes up to the limit (5 shapes)
			const shapesToCreate = Array.from({ length: 5 }, (_, i) => ({
				id: createShapeId(`shape-${i}`),
				type: 'geo' as const,
				x: i * 50,
				y: 0,
				props: { w: 40, h: 40 },
			}))
			editor.createShapes(shapesToCreate)

			// Verify we're at the limit
			expect(editor.getCurrentPageShapeIds().size).toBe(5)
			expect(editor.canCreateShapes([{ type: 'geo' }])).toBe(false)
		})

		describe('note shape creation', () => {
			it('should handle click creation gracefully without crashing', () => {
				// Set up the note tool
				editor.setCurrentTool('note')
				editor.expectToBeIn('note.idle')

				// Simulate clicking to create a note shape - when max shapes is reached,
				// the note tool immediately cancels and stays in idle
				expect(() => {
					editor.pointerDown(300, 100)
				}).not.toThrow()

				// The note tool should immediately cancel when shape creation fails
				editor.expectToBeIn('note.idle')

				// Complete the pointer interaction
				expect(() => {
					editor.pointerUp(300, 100)
				}).not.toThrow()

				// The tool should remain in idle state
				editor.expectToBeIn('note.idle')

				// Verify no new shapes were created
				expect(editor.getCurrentPageShapeIds().size).toBe(5)
			})

			it('should handle drag creation gracefully without crashing', () => {
				// Set up the note tool
				editor.setCurrentTool('note')
				editor.expectToBeIn('note.idle')

				// Simulate starting to create a note shape - when max shapes is reached,
				// the note tool immediately cancels and stays in idle
				expect(() => {
					editor.pointerDown(300, 100)
				}).not.toThrow()

				// The note tool should immediately cancel when shape creation fails
				editor.expectToBeIn('note.idle')

				// Move and complete the interaction
				expect(() => {
					editor.pointerMove(350, 150)
					editor.pointerUp(350, 150)
				}).not.toThrow()

				// The tool should remain in idle state
				editor.expectToBeIn('note.idle')

				// Verify no new shapes were created
				expect(editor.getCurrentPageShapeIds().size).toBe(5)
			})

			it('should emit max-shapes event when limit is reached', () => {
				const maxShapesHandler = vi.fn()
				editor.addListener('max-shapes', maxShapesHandler)

				// Set up the note tool
				editor.setCurrentTool('note')

				// Try to create a shape that would exceed the limit
				editor.pointerDown(300, 100).pointerUp(300, 100)

				// The max-shapes event should have been emitted
				expect(maxShapesHandler).toHaveBeenCalledWith({
					name: expect.any(String),
					pageId: editor.getCurrentPageId(),
					count: 5,
				})
			})

			it('should properly handle cancellation during pointing state', () => {
				// With the fix, the note tool immediately cancels when max shapes reached,
				// so we test cancellation when the tool is in idle state
				editor.setCurrentTool('note')
				editor.expectToBeIn('note.idle')

				// Cancel should work without throwing even when already in idle
				expect(() => {
					editor.cancel()
				}).not.toThrow()

				// Should transition to select tool when cancelled from idle
				editor.expectToBeIn('select.idle')
			})

			it('should properly handle interruption during pointing state', () => {
				// With the fix, the note tool immediately cancels when max shapes reached,
				// so we test interruption when the tool is in idle state
				editor.setCurrentTool('note')
				editor.expectToBeIn('note.idle')

				// Interrupt should work without throwing even when already in idle
				expect(() => {
					editor.interrupt()
				}).not.toThrow()

				editor.expectToBeIn('note.idle')
			})
		})

		describe('geo shape creation', () => {
			it('should handle geo shape creation gracefully when limit is reached', () => {
				// Set up the geo tool
				editor.setCurrentTool('geo')
				editor.expectToBeIn('geo.idle')

				// Simulate clicking to create a geo shape
				editor.pointerDown(300, 100)
				editor.expectToBeIn('geo.pointing')

				// Complete the click without dragging
				expect(() => {
					editor.pointerUp(300, 100)
				}).not.toThrow()

				// The tool should handle the failure gracefully
				editor.expectToBeIn('geo.idle')

				// Verify no new shapes were created
				expect(editor.getCurrentPageShapeIds().size).toBe(5)
			})

			it('should handle geo shape drag creation gracefully when limit is reached', () => {
				// Set up the geo tool
				editor.setCurrentTool('geo')
				editor.expectToBeIn('geo.idle')

				// Simulate dragging to create a geo shape
				editor.pointerDown(300, 100)
				editor.expectToBeIn('geo.pointing')

				// Move to trigger drag (which attempts to create a shape)
				expect(() => {
					editor.pointerMove(350, 150)
				}).not.toThrow()

				// Complete the interaction
				expect(() => {
					editor.pointerUp(350, 150)
				}).not.toThrow()

				// Verify no new shapes were created
				expect(editor.getCurrentPageShapeIds().size).toBe(5)
			})
		})

		describe('frame shape creation', () => {
			it('should handle frame shape creation gracefully when limit is reached', () => {
				// Set up the frame tool
				editor.setCurrentTool('frame')
				editor.expectToBeIn('frame.idle')

				// Simulate clicking to create a frame shape
				editor.pointerDown(300, 100)
				editor.expectToBeIn('frame.pointing')

				// Complete the click without dragging
				expect(() => {
					editor.pointerUp(300, 100)
				}).not.toThrow()

				// The tool should handle the failure gracefully
				editor.expectToBeIn('frame.idle')

				// Verify no new shapes were created
				expect(editor.getCurrentPageShapeIds().size).toBe(5)
			})
		})
	})

	describe('when shapes can still be created', () => {
		beforeEach(() => {
			// Create only 3 shapes, leaving room for 2 more
			const shapesToCreate = Array.from({ length: 3 }, (_, i) => ({
				id: createShapeId(`shape-${i}`),
				type: 'geo' as const,
				x: i * 50,
				y: 0,
				props: { w: 40, h: 40 },
			}))
			editor.createShapes(shapesToCreate)

			// Verify we can still create shapes
			expect(editor.getCurrentPageShapeIds().size).toBe(3)
			expect(editor.canCreateShapes([{ type: 'geo' }])).toBe(true)
		})

		it('should create note shapes normally when under the limit', () => {
			// Set up the note tool
			editor.setCurrentTool('note')
			editor.expectToBeIn('note.idle')

			// Simulate creating a note shape
			editor.pointerDown(300, 100)
			editor.expectToBeIn('note.pointing')

			editor.pointerUp(300, 100)

			// Should have successfully created a shape and entered editing mode
			expect(editor.getCurrentPageShapeIds().size).toBe(4)
			editor.expectToBeIn('select.editing_shape')
		})

		it('should create geo shapes normally when under the limit', () => {
			// Set up the geo tool
			editor.setCurrentTool('geo')
			editor.expectToBeIn('geo.idle')

			// Simulate creating a geo shape
			editor.pointerDown(300, 100)
			editor.expectToBeIn('geo.pointing')

			editor.pointerUp(300, 100)

			// Should have successfully created a shape
			expect(editor.getCurrentPageShapeIds().size).toBe(4)
			// After creating a shape, tool transitions to select.idle
			editor.expectToBeIn('select.idle')
		})

		it('should create shapes normally with drag when under the limit', () => {
			// Set up the geo tool
			editor.setCurrentTool('geo')
			editor.expectToBeIn('geo.idle')

			// Simulate creating a shape with drag
			editor.pointerDown(300, 100)
			editor.expectToBeIn('geo.pointing')

			editor.pointerMove(350, 150)
			editor.expectToBeIn('select.resizing') // Enters resizing mode during drag creation

			editor.pointerUp(350, 150)

			// Should have successfully created a shape
			expect(editor.getCurrentPageShapeIds().size).toBe(4)
		})
	})

	describe('direct createShapes API behavior', () => {
		it('should return early and not create shapes when limit is reached', () => {
			// Fill to capacity
			const shapesToCreate = Array.from({ length: 5 }, (_, i) => ({
				id: createShapeId(`shape-${i}`),
				type: 'geo' as const,
				x: i * 50,
				y: 0,
				props: { w: 40, h: 40 },
			}))
			editor.createShapes(shapesToCreate)
			expect(editor.getCurrentPageShapeIds().size).toBe(5)

			// Try to create one more shape
			const maxShapesHandler = vi.fn()
			editor.addListener('max-shapes', maxShapesHandler)

			const extraShapeId = createShapeId('extra-shape')
			editor.createShapes([
				{
					id: extraShapeId,
					type: 'geo',
					x: 300,
					y: 100,
					props: { w: 40, h: 40 },
				},
			])

			// Should not have created the extra shape
			expect(editor.getCurrentPageShapeIds().size).toBe(5)
			expect(editor.getShape(extraShapeId)).toBeUndefined()

			// Should have emitted the max-shapes event
			expect(maxShapesHandler).toHaveBeenCalledWith({
				name: expect.any(String),
				pageId: editor.getCurrentPageId(),
				count: 5,
			})
		})

		it('should create shapes normally when under the limit', () => {
			// Create 3 shapes
			const shapesToCreate = Array.from({ length: 3 }, (_, i) => ({
				id: createShapeId(`shape-${i}`),
				type: 'geo' as const,
				x: i * 50,
				y: 0,
				props: { w: 40, h: 40 },
			}))
			editor.createShapes(shapesToCreate)
			expect(editor.getCurrentPageShapeIds().size).toBe(3)

			// Should be able to create 2 more
			const moreShapes = Array.from({ length: 2 }, (_, i) => ({
				id: createShapeId(`more-shape-${i}`),
				type: 'geo' as const,
				x: (i + 3) * 50,
				y: 0,
				props: { w: 40, h: 40 },
			}))
			editor.createShapes(moreShapes)

			// Should have created all shapes
			expect(editor.getCurrentPageShapeIds().size).toBe(5)
			moreShapes.forEach((shape) => {
				expect(editor.getShape(shape.id)).toBeDefined()
			})
		})
	})
})
