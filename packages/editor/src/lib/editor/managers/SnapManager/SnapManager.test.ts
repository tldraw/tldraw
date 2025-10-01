import {
	TLFrameShape,
	TLGroupShape,
	TLPageId,
	TLShape,
	TLShapeId,
	createShapeId,
} from '@tldraw/tlschema'
import { Mocked, vi } from 'vitest'
import { Box } from '../../../primitives/Box'
import { Vec } from '../../../primitives/Vec'
import { Editor } from '../../Editor'
import { BoundsSnaps } from './BoundsSnaps'
import { HandleSnaps } from './HandleSnaps'
import { GapsSnapIndicator, PointsSnapIndicator, SnapManager } from './SnapManager'

// Mock the Editor class
vi.mock('../../Editor')
vi.mock('./BoundsSnaps')
vi.mock('./HandleSnaps')

describe('SnapManager', () => {
	let editor: Mocked<Editor>
	let snapManager: SnapManager

	const createMockShape = (
		id: TLShapeId,
		type: string = 'geo',
		parentId: TLShapeId | string = 'page:page'
	) =>
		({
			id,
			type,
			parentId,
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1' as const,
			opacity: 1,
			isLocked: false,
			meta: {},
			props: {},
			typeName: 'shape' as const,
		}) as TLShape

	const createMockFrameShape = (id: TLShapeId): TLFrameShape =>
		({
			...createMockShape(id, 'frame'),
			type: 'frame',
			props: {
				w: 100,
				h: 100,
				name: '',
			},
		}) as TLFrameShape

	const createMockGroupShape = (id: TLShapeId): TLGroupShape =>
		({
			...createMockShape(id, 'group'),
			type: 'group',
			props: {},
		}) as TLGroupShape

	beforeEach(() => {
		editor = {
			getZoomLevel: vi.fn(() => 1),
			getViewportPageBounds: vi.fn(() => new Box(0, 0, 1000, 1000)),
			getSelectedShapeIds: vi.fn(() => []),
			getSelectedShapes: vi.fn(() => []),
			findCommonAncestor: vi.fn(() => createShapeId('page')),
			getCurrentPageId: vi.fn(() => 'page:page' as TLPageId),
			getSortedChildIdsForParent: vi.fn(() => []),
			getShape: vi.fn(),
			getShapeUtil: vi.fn(() => ({
				canSnap: vi.fn(() => true),
			})),
			getShapePageBounds: vi.fn(),
			isShapeOfType: vi.fn(),
		} as any

		snapManager = new SnapManager(editor)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('constructor and initialization', () => {
		it('should initialize with editor reference', () => {
			expect(snapManager.editor).toBe(editor)
		})

		it('should create BoundsSnaps instance', () => {
			expect(BoundsSnaps).toHaveBeenCalledWith(snapManager)
			expect(snapManager.shapeBounds).toBeInstanceOf(BoundsSnaps)
		})

		it('should create HandleSnaps instance', () => {
			expect(HandleSnaps).toHaveBeenCalledWith(snapManager)
			expect(snapManager.handles).toBeInstanceOf(HandleSnaps)
		})

		it('should initialize snap indicators as undefined', () => {
			expect(snapManager.getIndicators()).toEqual([])
		})
	})

	describe('indicator management', () => {
		describe('getIndicators', () => {
			it('should return empty array when no indicators are set', () => {
				expect(snapManager.getIndicators()).toEqual([])
			})

			it('should return set indicators', () => {
				const indicators: PointsSnapIndicator[] = [
					{
						id: 'test-indicator',
						type: 'points',
						points: [
							{ x: 10, y: 20 },
							{ x: 30, y: 40 },
						],
					},
				]

				snapManager.setIndicators(indicators)
				expect(snapManager.getIndicators()).toEqual(indicators)
			})
		})

		describe('setIndicators', () => {
			it('should set points indicators', () => {
				const indicators: PointsSnapIndicator[] = [
					{
						id: 'points-indicator',
						type: 'points',
						points: [new Vec(10, 20), new Vec(30, 40)],
					},
				]

				snapManager.setIndicators(indicators)
				expect(snapManager.getIndicators()).toEqual(indicators)
			})

			it('should set gaps indicators', () => {
				const indicators: GapsSnapIndicator[] = [
					{
						id: 'gaps-indicator',
						type: 'gaps',
						direction: 'horizontal',
						gaps: [
							{
								startEdge: [
									{ x: 0, y: 0 },
									{ x: 10, y: 0 },
								],
								endEdge: [
									{ x: 20, y: 0 },
									{ x: 30, y: 0 },
								],
							},
						],
					},
				]

				snapManager.setIndicators(indicators)
				expect(snapManager.getIndicators()).toEqual(indicators)
			})

			it('should set mixed indicator types', () => {
				const indicators = [
					{
						id: 'points-indicator',
						type: 'points' as const,
						points: [{ x: 10, y: 20 }],
					},
					{
						id: 'gaps-indicator',
						type: 'gaps' as const,
						direction: 'vertical' as const,
						gaps: [
							{
								startEdge: [
									{ x: 0, y: 0 },
									{ x: 0, y: 10 },
								] as [Vec, Vec],
								endEdge: [
									{ x: 0, y: 20 },
									{ x: 0, y: 30 },
								] as [Vec, Vec],
							},
						],
					},
				]

				snapManager.setIndicators(indicators)
				expect(snapManager.getIndicators()).toEqual(indicators)
			})
		})

		describe('clearIndicators', () => {
			it('should clear indicators when they exist', () => {
				const indicators: PointsSnapIndicator[] = [
					{
						id: 'test-indicator',
						type: 'points',
						points: [{ x: 10, y: 20 }],
					},
				]

				snapManager.setIndicators(indicators)
				expect(snapManager.getIndicators()).toHaveLength(1)

				snapManager.clearIndicators()
				expect(snapManager.getIndicators()).toEqual([])
			})

			it('should not throw when clearing empty indicators', () => {
				expect(() => snapManager.clearIndicators()).not.toThrow()
				expect(snapManager.getIndicators()).toEqual([])
			})
		})
	})

	describe('getSnapThreshold', () => {
		it('should calculate threshold based on zoom level', () => {
			editor.getZoomLevel.mockReturnValue(1)
			expect(snapManager.getSnapThreshold()).toBe(8)
		})

		it('should adjust threshold for different zoom levels', () => {
			// Create a new SnapManager for each zoom level to avoid computed value caching
			editor.getZoomLevel.mockReturnValue(2)
			const snapManager2 = new SnapManager(editor)
			expect(snapManager2.getSnapThreshold()).toBe(4)

			editor.getZoomLevel.mockReturnValue(0.5)
			const snapManager3 = new SnapManager(editor)
			expect(snapManager3.getSnapThreshold()).toBe(16)
		})

		it('should handle very small zoom levels', () => {
			editor.getZoomLevel.mockReturnValue(0.1)
			expect(snapManager.getSnapThreshold()).toBe(80)
		})

		it('should handle very large zoom levels', () => {
			editor.getZoomLevel.mockReturnValue(10)
			expect(snapManager.getSnapThreshold()).toBe(0.8)
		})
	})

	describe('getCurrentCommonAncestor', () => {
		it('should return common ancestor of selected shapes', () => {
			const shapeId = createShapeId('shape1')
			const selectedShapes = [createMockShape(shapeId)]

			editor.getSelectedShapes.mockReturnValue(selectedShapes as any)
			editor.findCommonAncestor.mockReturnValue(shapeId)

			expect(snapManager.getCurrentCommonAncestor()).toBe(shapeId)
			expect(editor.findCommonAncestor).toHaveBeenCalledWith(selectedShapes)
		})

		it('should return null when no common ancestor found', () => {
			editor.getSelectedShapes.mockReturnValue([])
			editor.findCommonAncestor.mockReturnValue(undefined)

			expect(snapManager.getCurrentCommonAncestor()).toBeUndefined()
		})
	})

	describe('getSnappableShapes', () => {
		it('should return empty set when no shapes in viewport', () => {
			editor.getSortedChildIdsForParent.mockReturnValue([])

			const result = snapManager.getSnappableShapes()
			expect(result).toBeInstanceOf(Set)
			expect(result.size).toBe(0)
		})

		it('should include shapes that can snap and are in viewport', () => {
			const shapeId = createShapeId('shape1')
			const shape = createMockShape(shapeId)

			editor.getSortedChildIdsForParent.mockReturnValue([shapeId])
			editor.getShape.mockReturnValue(shape as any)
			editor.getShapePageBounds.mockReturnValue(new Box(10, 10, 50, 50))
			editor.getViewportPageBounds.mockReturnValue(new Box(0, 0, 100, 100))

			const result = snapManager.getSnappableShapes()
			expect(result.has(shapeId)).toBe(true)
		})

		it('should exclude selected shapes', () => {
			const selectedId = createShapeId('selected')
			const unselectedId = createShapeId('unselected')

			editor.getSelectedShapeIds.mockReturnValue([selectedId])
			editor.getSortedChildIdsForParent.mockReturnValue([selectedId, unselectedId])
			editor.getShape.mockReturnValue(createMockShape(unselectedId) as any)
			editor.getShapePageBounds.mockReturnValue(new Box(10, 10, 50, 50))

			const result = snapManager.getSnappableShapes()
			expect(result.has(selectedId)).toBe(false)
			expect(result.has(unselectedId)).toBe(true)
		})

		it('should exclude shapes that cannot snap', () => {
			const shapeId = createShapeId('shape1')
			const shape = createMockShape(shapeId)

			editor.getSortedChildIdsForParent.mockReturnValue([shapeId])
			editor.getShape.mockReturnValue(shape as any)
			editor.getShapeUtil.mockReturnValue({
				canSnap: vi.fn(() => false),
			} as any)

			const result = snapManager.getSnappableShapes()
			expect(result.has(shapeId)).toBe(false)
		})

		it('should exclude shapes outside viewport bounds', () => {
			const shapeId = createShapeId('shape1')
			const shape = createMockShape(shapeId)

			editor.getSortedChildIdsForParent.mockReturnValue([shapeId])
			editor.getShape.mockReturnValue(shape as any)
			editor.getShapePageBounds.mockReturnValue(new Box(200, 200, 50, 50))
			editor.getViewportPageBounds.mockReturnValue(new Box(0, 0, 100, 100))

			const result = snapManager.getSnappableShapes()
			expect(result.has(shapeId)).toBe(false)
		})

		it('should include frame shapes as snappable', () => {
			const frameId = createShapeId('frame1')
			const frameShape = createMockFrameShape(frameId)

			editor.getSortedChildIdsForParent.mockReturnValue([frameId])
			editor.getShape.mockReturnValue(frameShape)
			editor.isShapeOfType.mockImplementation((_shape, type) => type === 'frame')
			editor.getShapePageBounds.mockReturnValue(new Box(10, 10, 50, 50))

			const result = snapManager.getSnappableShapes()
			expect(result.has(frameId)).toBe(true)
		})

		it('should recurse into group shapes but not include group itself', () => {
			const groupId = createShapeId('group1')
			const childId = createShapeId('child1')
			const groupShape = createMockGroupShape(groupId)
			const childShape = createMockShape(childId)

			editor.getSortedChildIdsForParent
				.mockReturnValueOnce([groupId]) // Root level
				.mockReturnValueOnce([childId]) // Inside group

			editor.getShape.mockImplementation((id) => {
				if (id === groupId) return groupShape
				if (id === childId) return childShape
				return undefined
			})

			editor.isShapeOfType.mockImplementation((shape: any, type) => shape && shape.type === type)

			editor.getShapePageBounds.mockReturnValue(new Box(10, 10, 50, 50))

			const result = snapManager.getSnappableShapes()
			expect(result.has(groupId)).toBe(false) // Group itself not included
			expect(result.has(childId)).toBe(true) // Child is included
		})

		it('should handle nested frame structures', () => {
			const parentFrameId = createShapeId('parent-frame')
			const childFrameId = createShapeId('child-frame')
			const parentFrame = createMockFrameShape(parentFrameId)
			const childFrame = createMockFrameShape(childFrameId)

			// Override the getCurrentCommonAncestor mock for this specific test
			const originalGetCurrentCommonAncestor = snapManager.getCurrentCommonAncestor
			vi.spyOn(snapManager, 'getCurrentCommonAncestor').mockReturnValue(parentFrameId)

			editor.getSortedChildIdsForParent.mockReturnValueOnce([childFrameId]) // Children of parent frame

			editor.getShape.mockImplementation((id: any) => {
				if (id === parentFrameId) return parentFrame as any
				if (id === childFrameId) return childFrame as any
				return undefined
			})

			editor.isShapeOfType.mockImplementation((shape: any, type: any) => type === 'frame')
			editor.getShapePageBounds.mockReturnValue(new Box(10, 10, 50, 50))

			const result = snapManager.getSnappableShapes()
			expect(result.has(childFrameId)).toBe(true)

			// Restore original method
			vi.spyOn(snapManager, 'getCurrentCommonAncestor').mockImplementation(
				originalGetCurrentCommonAncestor
			)
		})

		it('should handle missing shape bounds gracefully', () => {
			const shapeId = createShapeId('shape1')
			const shape = createMockShape(shapeId)

			editor.getSortedChildIdsForParent.mockReturnValue([shapeId])
			editor.getShape.mockReturnValue(shape as any)
			editor.getShapePageBounds.mockReturnValue(undefined)

			const result = snapManager.getSnappableShapes()
			expect(result.has(shapeId)).toBe(false)
		})

		it('should handle missing shapes gracefully', () => {
			const shapeId = createShapeId('shape1')

			editor.getSortedChildIdsForParent.mockReturnValue([shapeId])
			editor.getShape.mockReturnValue(undefined)

			const result = snapManager.getSnappableShapes()
			expect(result.has(shapeId)).toBe(false)
		})

		it('should use current page as fallback when no common ancestor', () => {
			const shapeId = createShapeId('shape1')
			const shape = createMockShape(shapeId)

			// Override the getCurrentCommonAncestor mock for this specific test
			const originalGetCurrentCommonAncestor = snapManager.getCurrentCommonAncestor
			vi.spyOn(snapManager, 'getCurrentCommonAncestor').mockReturnValue(undefined)

			editor.getCurrentPageId.mockReturnValue('page:current' as TLPageId)
			editor.getSortedChildIdsForParent.mockReturnValue([shapeId])
			editor.getShape.mockReturnValue(shape as any)
			editor.getShapePageBounds.mockReturnValue(new Box(10, 10, 50, 50))

			snapManager.getSnappableShapes()
			expect(editor.getSortedChildIdsForParent).toHaveBeenCalledWith('page:current')

			// Restore original method
			vi.spyOn(snapManager, 'getCurrentCommonAncestor').mockImplementation(
				originalGetCurrentCommonAncestor
			)
		})
	})

	describe('computed properties behavior', () => {
		it('should calculate threshold based on current zoom level', () => {
			// Test with different SnapManager instances to verify the computation works
			editor.getZoomLevel.mockReturnValue(1)
			const snapManager1 = new SnapManager(editor)
			const threshold1 = snapManager1.getSnapThreshold()

			editor.getZoomLevel.mockReturnValue(2)
			const snapManager2 = new SnapManager(editor)
			const threshold2 = snapManager2.getSnapThreshold()

			expect(threshold1).toBe(8)
			expect(threshold2).toBe(4)
		})

		it('should calculate snappable shapes based on current editor state', () => {
			const shapeId1 = createShapeId('shape1')
			const shapeId2 = createShapeId('shape2')

			// Test with first set of shapes
			editor.getSortedChildIdsForParent.mockReturnValue([shapeId1])
			editor.getShape.mockReturnValue(createMockShape(shapeId1) as any)
			editor.getShapePageBounds.mockReturnValue(new Box(10, 10, 50, 50))

			const snapManager1 = new SnapManager(editor)
			const result1 = snapManager1.getSnappableShapes()
			expect(result1.has(shapeId1)).toBe(true)
			expect(result1.has(shapeId2)).toBe(false)

			// Test with second set of shapes
			editor.getSortedChildIdsForParent.mockReturnValue([shapeId1, shapeId2])
			editor.getShape.mockImplementation((id: any) => {
				if (id === shapeId1) return createMockShape(shapeId1) as any
				if (id === shapeId2) return createMockShape(shapeId2) as any
				return undefined
			})

			const snapManager2 = new SnapManager(editor)
			const result2 = snapManager2.getSnappableShapes()
			expect(result2.has(shapeId1)).toBe(true)
			expect(result2.has(shapeId2)).toBe(true)
		})
	})
})
